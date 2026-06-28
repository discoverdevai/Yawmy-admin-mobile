import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reset from '../assets/icons/reset.svg';
import Calendar from '../assets/icons/calendar.svg';
import DatePickerModal from './DatePickerModal';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Attendance filter (Figma 598-116126): by rooms (multi-select) and by date
 * (calendar, Figma 598-116269). Apply reports { rooms, date }.
 */
export default function AttendanceFilterModal({
  visible,
  rooms = [],
  initial = { rooms: [], date: null },
  onClose,
  onApply,
}) {
  const [selRooms, setSelRooms] = useState([]);
  const [date, setDate] = useState(null); // "DD MMM YYYY" | null
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelRooms(initial.rooms || []);
    setDate(initial.date ?? null);
    setShowCalendar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggleRoom = (r) =>
    setSelRooms((list) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]));

  const count = selRooms.length + (date ? 1 : 0);

  const resetAll = () => {
    setSelRooms([]);
    setDate(null);
  };

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
                <View style={styles.section}>
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

                {/* By date */}
                <View style={styles.sectionLast}>
                  <Text style={styles.sectionLabel}>By Date</Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Choose Date</Text>
                    <Pressable style={styles.dateBox} onPress={() => setShowCalendar(true)}>
                      <Text style={[styles.dateText, !date && styles.datePlaceholder]}>
                        {date || 'Choose date'}
                      </Text>
                      <Calendar width={24} height={24} />
                    </Pressable>
                  </View>
                </View>
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onApply({ rooms: selRooms, date })}
              >
                <Text style={styles.ctaText}>Apply Filter{count > 0 ? ` (${count})` : ''}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>

      <DatePickerModal
        visible={showCalendar}
        value={date}
        format="DD MMM YYYY"
        onClose={() => setShowCalendar(false)}
        onSelect={setDate}
      />
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

  section: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    marginBottom: Spacing.md,
  },
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

  fieldGroup: { gap: Spacing.sm + 4 },
  fieldLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  dateBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  dateText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  datePlaceholder: { color: Colors.gray },

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
