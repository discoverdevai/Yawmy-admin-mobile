import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Search from '../assets/icons/search.svg';
import LinkIcon from '../assets/icons/link.svg';
import Done from '../assets/icons/done.svg';
import AuthImage from './AuthImage';
import { getLinkableChildren } from '../services/parentService';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const childAvatar = require('../assets/images/child-avatar.png');
const shortId = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();

/**
 * Bottom-sheet to link nursery children to a parent (Figma 598-111724).
 * Fetches children that can be linked (none of the parent's role yet). Each row
 * has a Link button that flips to "Done"; Confirm sends the selected ids.
 */
export default function LinkChildrenModal({ visible, parentId, submitting, onClose, onConfirm }) {
  const [query, setQuery] = useState('');
  const [children, setChildren] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !parentId) return;
    let alive = true;
    setLoading(true);
    setSelectedIds([]);
    setQuery('');
    getLinkableChildren(parentId)
      .then((list) => alive && setChildren(Array.isArray(list) ? list : []))
      .catch(() => alive && setChildren([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [visible, parentId]);

  const toggle = (id) =>
    setSelectedIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const q = query.trim().toLowerCase();
  const list = children.filter((c) => (c.fullName || '').toLowerCase().includes(q));

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
              {loading ? (
                <ActivityIndicator style={{ marginVertical: Spacing.lg }} color={Colors.primary} />
              ) : (
                <ScrollView
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {list.length === 0 && <Text style={styles.empty}>No children available to link.</Text>}
                  {list.map((c) => {
                    const linked = selectedIds.includes(c.id);
                    return (
                      <View key={c.id} style={styles.card}>
                        <AuthImage
                          path={c.photoUrl}
                          fallback={childAvatar}
                          style={styles.avatar}
                          contentFit="cover"
                        />
                        <View style={styles.cardText}>
                          <Text style={styles.name} numberOfLines={1}>{c.fullName}</Text>
                          <Text style={styles.childId}>ID: {shortId(c.id)}</Text>
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
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  (submitting || selectedIds.length === 0) && styles.ctaDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => onConfirm(selectedIds)}
                disabled={submitting || selectedIds.length === 0}
              >
                <Text style={styles.ctaText}>{submitting ? 'Linking…' : 'Confirm'}</Text>
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
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
