import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { downloadCsv } from '../utils/exportCsv';
import Check from '../assets/icons/check.svg';
import ChevronDown from '../assets/icons/chevron-down.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

// Build a CSV string from the chosen child records.
const buildCsv = (rows) => {
  const header = 'ID,Name,Gender,Age (months),Room';
  const body = rows.map(
    (c) => `${c.childId},"${c.name}",${c.gender},${c.ageMonths},"${c.room}"`
  );
  return [header, ...body].join('\n');
};

/**
 * Export Child Records bottom-sheet (Figma 598-116969): pick all / specific
 * children, optionally filter by rooms, then export a CSV file.
 */
export default function ExportChildModal({ visible, allChildren = [], roomNames = [], onClose, onDownloaded }) {
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedRooms([]);
    setSelectedIds(allChildren.map((c) => c.id)); // default: all children
    setListOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Children shown / exported, narrowed by the room filter.
  const filtered = allChildren.filter(
    (c) => selectedRooms.length === 0 || selectedRooms.includes(c.room)
  );
  const exportRows = filtered.filter((c) => selectedIds.includes(c.id));
  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  const toggleAll = () =>
    setSelectedIds((cur) => {
      if (allSelected) {
        const remove = new Set(filtered.map((c) => c.id));
        return cur.filter((id) => !remove.has(id));
      }
      return [...new Set([...cur, ...filtered.map((c) => c.id)])];
    });

  const toggleChild = (id) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const toggleRoom = (r) =>
    setSelectedRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const childLabel =
    filtered.length === 0
      ? 'No children'
      : allSelected
        ? 'All Children'
        : exportRows.length > 0
          ? `${exportRows.length} selected`
          : 'Select children';

  // Write a CSV from local data and download it onto the phone.
  const exportCsv = async () => {
    if (exportRows.length === 0) return;
    const ok = await downloadCsv('child-records.csv', buildCsv(exportRows));
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
                <Text style={styles.title}>Export Child Records</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* By children */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>By Children</Text>

                  <View style={[styles.childField, (allSelected || exportRows.length > 0) && styles.childFieldOn]}>
                    <Pressable style={styles.childFieldText} onPress={() => setListOpen((o) => !o)}>
                      <Text style={styles.childFieldLabel}>{childLabel}</Text>
                      <ChevronDown width={20} height={20} style={listOpen ? styles.chevronUp : undefined} />
                    </Pressable>
                    <Pressable onPress={toggleAll} hitSlop={8}>
                      <View style={[styles.checkbox, allSelected && styles.checkboxOn]}>
                        {allSelected && <Check width={16} height={16} />}
                      </View>
                    </Pressable>
                  </View>

                  {listOpen && (
                    <View style={styles.dropdown}>
                      {filtered.map((c) => {
                        const on = selectedIds.includes(c.id);
                        return (
                          <Pressable key={c.id} style={styles.childRow} onPress={() => toggleChild(c.id)}>
                            <View style={styles.childInfo}>
                              <Text style={styles.childName}>{c.name}</Text>
                              <Text style={styles.childRoom}>{c.room}</Text>
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

              <Pressable
                style={[styles.cta, exportRows.length === 0 && styles.ctaDisabled]}
                onPress={exportCsv}
                disabled={exportRows.length === 0}
              >
                <Text style={styles.ctaText}>Export As CSV</Text>
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

  childField: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  childFieldOn: { backgroundColor: Colors.primaryBgLight, borderColor: Colors.primary },
  childFieldText: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: Spacing.sm },
  childFieldLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  chevronUp: { transform: [{ rotate: '180deg' }] },

  dropdown: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.md,
    overflow: 'hidden',
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
  childRoom: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, marginTop: 2 },

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
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
