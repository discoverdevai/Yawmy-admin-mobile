import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ABBR[d.getMonth()]} ${d.getFullYear()}`;

// Synthetic incident details so the export is consistent with the child filter.
const REASONS = ['Fall incident.', 'Minor scratch.', 'Allergic reaction.', 'Bite mark.'];
const AREAS = ['Left knee', 'Right hand', 'Face', 'Left arm', 'Forehead'];
const ACTIONS = ['Applied ice pack', 'Cleaned and bandaged', 'Administered antihistamine', 'Cleaned and monitored'];

const incidentFor = (c) => {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - (c.id % 14));
  return {
    name: c.name,
    room: c.room,
    date: d,
    reason: REASONS[c.id % REASONS.length],
    action: ACTIONS[c.id % ACTIONS.length],
    area: AREAS[c.id % AREAS.length],
    ack: c.id % 2 ? 'Seen' : 'Pending',
  };
};

const buildCsv = (rows) => {
  const header = 'Child,Room,Date,Reason,Action Taken,Affected Area,Parent Ack';
  const body = rows.map(
    (r) => `"${r.name}","${r.room}",${fmtDate(r.date)},"${r.reason}","${r.action}","${r.area}",${r.ack}`
  );
  return [header, ...body].join('\n');
};

/**
 * Export Incident Log bottom-sheet (Figma 598-117104; the Figma title reads
 * "Export Attendance Logs" by mistake). Filter by child(ren), a date range and
 * rooms, then export a CSV.
 */
export default function ExportIncidentModal({ visible, allChildren = [], roomNames = [], onClose }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [childOpen, setChildOpen] = useState(false);
  const [range, setRange] = useState(null); // { from, to } as "DD MMM YYYY"
  const [showRange, setShowRange] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);

  useEffect(() => {
    if (!visible) return;
    setSelectedIds([]);
    setChildOpen(false);
    setRange(null);
    setSelectedRooms([]);
  }, [visible]);

  const allSelected = allChildren.length > 0 && selectedIds.length === allChildren.length;

  const toggleAll = () => setSelectedIds(allSelected ? [] : allChildren.map((c) => c.id));
  const toggleChild = (id) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleRoom = (r) =>
    setSelectedRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const childLabel = allSelected
    ? 'All Children'
    : selectedIds.length > 0
      ? `${selectedIds.length} selected`
      : 'Select child name';
  const dateLabel = range ? `${range.from} - ${range.to}` : 'Select date range';

  const buildRows = () => {
    let children = selectedIds.length ? allChildren.filter((c) => selectedIds.includes(c.id)) : allChildren;
    if (selectedRooms.length) children = children.filter((c) => selectedRooms.includes(c.room));

    let rows = children.map(incidentFor);
    if (range) {
      const from = parse(range.from);
      const to = parse(range.to);
      rows = rows.filter((r) => r.date.getTime() >= from.getTime() && r.date.getTime() <= to.getTime());
    }
    return rows;
  };

  const exportCsv = async () => {
    const rows = buildRows();
    if (rows.length === 0) {
      Alert.alert('No data', 'No incident records match the selected filters.');
      return;
    }
    try {
      const uri = FileSystem.cacheDirectory + 'incident-log.csv';
      await FileSystem.writeAsStringAsync(uri, buildCsv(rows), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Incident Log',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Saved', `Incident log exported to:\n${uri}`);
      }
      onClose?.();
    } catch (e) {
      Alert.alert('Export failed', String(e?.message || e));
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
                <Text style={styles.title}>Export Incident Log</Text>
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
                <View style={styles.sectionLast}>
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
