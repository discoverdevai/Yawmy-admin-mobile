import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { downloadCsv } from '../utils/exportCsv';
import Check from '../assets/icons/check.svg';
import ChevronDown from '../assets/icons/chevron-down.svg';
import Calendar from '../assets/icons/calendar.svg';
import DateRangePickerModal from './DateRangePickerModal';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parse = (s) => {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s || '');
  if (!m) return null;
  const mon = MONTHS_ABBR.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  return mon >= 0 ? new Date(Number(m[3]), mon, Number(m[1])) : null;
};

// Dummy attendance status (matches the Attendance screen's rule).
const isAbsent = (childId, day) => (childId * 3 + day) % 7 === 0;

const buildCsv = (rows) => {
  const header = 'Child,Room,Date,Status,Check In,Check Out';
  const body = rows.map(
    (r) => `"${r.name}","${r.room}",${r.date},${r.status},${r.checkIn},${r.checkOut}`
  );
  return [header, ...body].join('\n');
};

/**
 * Export Attendance Logs bottom-sheet (Figma 598-117029): filter by child(ren),
 * a date range, rooms and status, then export a CSV.
 */
export default function ExportAttendanceModal({ visible, allChildren = [], roomNames = [], onClose, onDownloaded }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [childOpen, setChildOpen] = useState(false);
  const [range, setRange] = useState(null); // { from, to } as "DD MMM YYYY"
  const [showRange, setShowRange] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]); // 'Present' | 'Absent'

  useEffect(() => {
    if (!visible) return;
    setSelectedIds([]);
    setChildOpen(false);
    setRange(null);
    setSelectedRooms([]);
    setSelectedStatus([]);
  }, [visible]);

  const allSelected = allChildren.length > 0 && selectedIds.length === allChildren.length;

  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : allChildren.map((c) => c.id));
  const toggleChild = (id) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleRoom = (r) =>
    setSelectedRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  const toggleStatus = (s) =>
    setSelectedStatus((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const childLabel = allSelected
    ? 'All Children'
    : selectedIds.length > 0
      ? `${selectedIds.length} selected`
      : 'Select child name';

  const dateLabel = range ? `${range.from} - ${range.to}` : 'Select date range';

  // Generate attendance rows from local data for the chosen filters.
  const buildRows = () => {
    // Children: selected ones, or all when none picked.
    let children = selectedIds.length ? allChildren.filter((c) => selectedIds.includes(c.id)) : allChildren;
    // Rooms: selected ones, or all when none picked.
    if (selectedRooms.length) children = children.filter((c) => selectedRooms.includes(c.room));

    // Date range: selected range, or just today when none picked.
    const start = range ? parse(range.from) : new Date();
    const end = range ? parse(range.to) : new Date();
    const days = [];
    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    const rows = [];
    children.forEach((c) => {
      days.forEach((day) => {
        const absent = isAbsent(c.id, day.getDate());
        const status = absent ? 'Absent' : 'Present';
        if (selectedStatus.length && !selectedStatus.includes(status)) return;
        rows.push({
          name: c.name,
          room: c.room,
          date: `${String(day.getDate()).padStart(2, '0')} ${MONTHS_ABBR[day.getMonth()]} ${day.getFullYear()}`,
          status,
          checkIn: absent ? '--' : '08:00 AM',
          checkOut: absent ? '--' : '12:00 PM',
        });
      });
    });
    return rows;
  };

  const exportCsv = async () => {
    const rows = buildRows();
    if (rows.length === 0) {
      return;
    }
    const ok = await downloadCsv('attendance-logs.csv', buildCsv(rows));
    if (ok) {
      onClose?.();
      onDownloaded?.();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <View style={styles.head}>
                <Text style={styles.title}>Export Attendance Logs</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* By child */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>By child</Text>
                  <Pressable style={styles.field} onPress={() => setChildOpen((o) => !o)}>
                    <Text style={[styles.fieldText, !selectedIds.length && styles.placeholder]}>{childLabel}</Text>
                    <ChevronDown width={24} height={24} style={childOpen ? styles.chevronUp : undefined} />
                  </Pressable>
                  {childOpen && (
                    <View style={styles.dropdown}>
                      <Pressable style={styles.childRow} onPress={toggleAll}>
                        <Text style={styles.childName}>All Children</Text>
                        <View style={[styles.checkbox, allSelected && styles.checkboxOn]}>
                          {allSelected && <Check width={16} height={16} />}
                        </View>
                      </Pressable>
                      {allChildren.map((c) => {
                        const on = selectedIds.includes(c.id);
                        return (
                          <Pressable key={c.id} style={styles.childRow} onPress={() => toggleChild(c.id)}>
                            <View style={styles.childInfo}>
                              <Text style={styles.childName}>{c.name}</Text>
                              <Text style={styles.childSub}>{c.room}</Text>
                            </View>
                            <View style={[styles.checkbox, on && styles.checkboxOn]}>
                              {on && <Check width={16} height={16} />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* By date range */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>By Date Range</Text>
                  <Pressable style={styles.field} onPress={() => setShowRange(true)}>
                    <Text style={[styles.fieldText, !range && styles.placeholder]}>{dateLabel}</Text>
                    <Calendar width={24} height={24} />
                  </Pressable>
                </View>

                {/* By rooms */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>By Rooms</Text>
                  <View style={styles.chipRow}>
                    {roomNames.map((r) => {
                      const on = selectedRooms.includes(r);
                      return (
                        <Pressable key={r} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleRoom(r)}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{r}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* By status */}
                <View style={styles.sectionLast}>
                  <Text style={styles.sectionLabel}>By Status</Text>
                  <View style={styles.chipRow}>
                    {['Present', 'Absent'].map((s) => {
                      const on = selectedStatus.includes(s);
                      return (
                        <Pressable key={s} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleStatus(s)}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={exportCsv}>
                <Text style={styles.ctaText}>Export As CSV</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>

      <DateRangePickerModal
        visible={showRange}
        onClose={() => setShowRange(false)}
        onSelect={(r) => {
          setRange(r);
          setShowRange(false);
        }}
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
    maxHeight: '88%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },

  head: {
    height: 36,
    justifyContent: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  section: {
    gap: Spacing.sm + 4,
    paddingBottom: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    marginBottom: Spacing.md,
  },
  sectionLast: { gap: Spacing.md },
  sectionLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },

  field: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  fieldText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  placeholder: { color: Colors.gray },
  chevronUp: { transform: [{ rotate: '180deg' }] },

  dropdown: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.md,
    overflow: 'hidden',
    maxHeight: 240,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  childInfo: { flex: 1 },
  childName: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  childSub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, marginTop: 2 },
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
