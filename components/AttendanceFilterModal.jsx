import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reset from '../assets/icons/reset.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Attendance filter (Figma 598-116233): by rooms (multi-select). The date filter
 * from the design is intentionally omitted — the roster is already fetched for the
 * date picked in the calendar. Apply reports { rooms }.
 */
export default function AttendanceFilterModal({
  visible,
  rooms = [],
  initial = { rooms: [] },
  onClose,
  onApply,
}) {
  const [selRooms, setSelRooms] = useState([]);

  useEffect(() => {
    if (!visible) return;
    setSelRooms(initial.rooms || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggleRoom = (r) =>
    setSelRooms((list) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]));

  const count = selRooms.length;

  const resetAll = () => setSelRooms([]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.head}>
                <Text style={styles.title}>Filter</Text>
                <Pressable style={styles.reset} onPress={resetAll} hitSlop={8}>
                  <Reset width={16} height={16} />
                  <Text style={styles.resetText}>Reset all</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* By rooms */}
                <View style={styles.sectionLast}>
                  <Text style={styles.sectionLabel}>By Rooms</Text>
                  <View style={styles.chipRow}>
                    {rooms.map((r) => {
                      const on = selRooms.includes(r);
                      return (
                        <Pressable
                          key={r}
                          onPress={() => toggleRoom(r)}
                          style={[styles.chip, on && styles.chipOn]}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{r}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onApply({ rooms: selRooms })}
              >
                <Text style={styles.ctaText}>Apply Filter{count > 0 ? ` (${count})` : ''}</Text>
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
  content: { padding: Spacing.md, gap: Spacing.md },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  reset: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  resetText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.accent },

  sectionLast: { gap: Spacing.md },
  sectionLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  chip: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipOn: { backgroundColor: Colors.primaryBgLight, borderColor: Colors.primary },
  chipText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  chipTextOn: { color: Colors.primaryText },

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
