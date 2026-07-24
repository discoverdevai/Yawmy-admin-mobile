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
import Check from '../assets/icons/check.svg';
import AuthImage from './AuthImage';
import { getChildren } from '../services/childrenService';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const avatarFallback = require('../assets/images/child-avatar.png');
const shortId = (id) => String(id).replace(/-/g, '').slice(0, 8).toUpperCase();

/**
 * Pick specific children to export (Figma 809-39689). Fetches the children in the
 * chosen room (all enrolled children when roomId is null). Confirm reports the
 * checked child ids.
 */
export default function SelectChildModal({ visible, roomId, initialSelectedIds = [], onClose, onConfirm }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelected(initialSelectedIds);
    setLoading(true);
    getChildren(roomId ? { roomId } : {})
      .then((c) => setChildren(Array.isArray(c) ? c : []))
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, roomId]);

  const q = query.trim().toLowerCase();
  const filtered = children.filter((c) => !q || (c.fullName || '').toLowerCase().includes(q));
  const toggle = (id) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>Select Child</Text>

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

              {loading ? (
                <ActivityIndicator style={{ marginVertical: Spacing.lg }} color={Colors.primary} />
              ) : (
                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                  {filtered.length === 0 ? (
                    <Text style={styles.empty}>No children found.</Text>
                  ) : (
                    filtered.map((c) => {
                      const on = selected.includes(c.id);
                      return (
                        <Pressable key={c.id} style={styles.row} onPress={() => toggle(c.id)}>
                          <AuthImage path={c.photoUrl} fallback={avatarFallback} style={styles.avatar} contentFit="cover" />
                          <View style={styles.info}>
                            <Text style={styles.name} numberOfLines={1}>{c.fullName}</Text>
                            <Text style={styles.id}>ID: {shortId(c.id)}</Text>
                          </View>
                          <View style={[styles.checkbox, on && styles.checkboxOn]}>
                            {on && <Check width={16} height={16} />}
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              )}

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => {
                  onConfirm?.(selected);
                  onClose?.();
                }}
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
    maxHeight: '85%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
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
  searchInput: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  list: { flexGrow: 0 },
  empty: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, paddingVertical: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    marginBottom: Spacing.sm + 4,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.secStroke },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  id: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, marginTop: 2 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: Colors.primary, backgroundColor: Colors.white },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
