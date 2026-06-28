import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Search from '../assets/icons/search.svg';
import LinkIcon from '../assets/icons/link.svg';
import Done from '../assets/icons/done.svg';
import { useRooms } from '../context/RoomsContext';
import { CHILDREN } from '../constants/people';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const childAvatar = require('../assets/images/child-avatar.png');

/**
 * Bottom-sheet to link nursery children to a parent (Figma 598-111688 / 598-111841).
 * Each row has a Link button that flips to "Done" once linked; Confirm commits.
 */
export default function LinkChildrenModal({ visible, initialLinked = [], onClose, onConfirm }) {
  const { rooms, enrolledChildren } = useRooms();
  const [query, setQuery] = useState('');
  const [linkedIds, setLinkedIds] = useState([]);

  // The room a child belongs to (used to record "Name, Room" on the parent).
  const roomNameOf = (childId) => {
    const r = rooms.find((rm) => rm.childIds.includes(childId));
    return r ? r.name : 'Unassigned';
  };

  // Resolve the parent's existing linked children (by name) to child ids.
  useEffect(() => {
    if (!visible) return;
    const names = initialLinked.map((c) => c.name);
    setLinkedIds(enrolledChildren.filter((c) => names.includes(c.name)).map((c) => c.id));
    setQuery('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id) =>
    setLinkedIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const q = query.trim().toLowerCase();
  const list = enrolledChildren.filter((c) => c.name.toLowerCase().includes(q));

  const handleConfirm = () => {
    const linked = enrolledChildren
      .filter((c) => linkedIds.includes(c.id))
      .map((c) => ({ name: c.name, room: roomNameOf(c.id) }));
    onConfirm(linked);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>Link Children</Text>

              {/* Search */}
              <View style={styles.searchField}>
                <Search width={24} height={24} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search"
                  placeholderTextColor={Colors.gray}
                />
              </View>

              {/* Children list */}
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {list.length === 0 && <Text style={styles.empty}>No children found.</Text>}
                {list.map((c) => {
                  const linked = linkedIds.includes(c.id);
                  return (
                    <View key={c.id} style={styles.card}>
                      <Image source={childAvatar} style={styles.avatar} contentFit="cover" />
                      <View style={styles.cardText}>
                        <Text style={styles.name} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.childId}>ID: {c.childId}</Text>
                      </View>
                      <Pressable
                        onPress={() => toggle(c.id)}
                        style={[styles.actionBtn, linked ? styles.doneBtn : styles.linkBtn]}
                      >
                        {linked ? <Done width={16} height={16} /> : <LinkIcon width={16} height={16} />}
                        <Text style={[styles.actionText, linked ? styles.doneText : styles.linkText]}>
                          {linked ? 'Done' : 'Link'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={handleConfirm}
              >
                <Text style={styles.ctaText}>Confirm</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '80%',
  },
  content: { padding: Spacing.md, gap: Spacing.sm + 4 },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },

  list: { flexGrow: 0 },
  listContent: { gap: Spacing.sm + 4, paddingBottom: Spacing.xs },
  empty: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  cardText: { flex: 1, gap: Spacing.sm },
  name: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  childId: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  linkBtn: { backgroundColor: Colors.primary },
  doneBtn: { backgroundColor: Colors.accentSecBg },
  actionText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 12 },
  linkText: { color: Colors.white },
  doneText: { color: Colors.accent },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
