import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import ArrowLeft from '../assets/icons/arrow-left.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');

const fmt = (d) => `${pad(d.getDate())} ${MONTHS_ABBR[d.getMonth()]} ${d.getFullYear()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a, b) => a && b && startOfDay(a).getTime() === startOfDay(b).getTime();

/**
 * Date-range calendar: tap a start date, then an end date (must be after the
 * start). Future dates (after today) are disabled. On the second pick the
 * modal closes and reports { from, to } as "DD MMM YYYY".
 */
export default function DateRangePickerModal({ visible, onClose, onSelect }) {
  const today = startOfDay(new Date());
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setFrom(null);
    setTo(null);
    setView({ year: today.getFullYear(), month: today.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const shiftMonth = (delta) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const { year, month } = view;
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ offset: -1, day: 0 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ offset: 0, day: d });
  while (cells.length % 7 !== 0) cells.push({ offset: 1, day: 0 });

  const dateOf = (cell, idx) => {
    if (cell.offset === 0) return new Date(year, month, cell.day);
    if (cell.offset === -1) return new Date(year, month, 1 - (startDow - idx));
    return new Date(year, month, daysInMonth + (idx - (startDow + daysInMonth)) + 1);
  };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const pick = (d) => {
    if (d.getTime() > today.getTime()) return; // no future dates
    // Start a fresh range when there's no start yet, or a full range exists.
    if (!from || (from && to)) {
      setFrom(d);
      setTo(null);
      return;
    }
    // Second tap: must be after the start, otherwise restart from here.
    if (d.getTime() <= from.getTime()) {
      setFrom(d);
      return;
    }
    setTo(d);
    onSelect({ from: fmt(from), to: fmt(d) });
    onClose();
  };

  const inRange = (d) => from && to && d.getTime() > from.getTime() && d.getTime() < to.getTime();
  const isEndpoint = (d) => sameDay(d, from) || sameDay(d, to);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={styles.monthLabel}>{`${MONTHS[month]} ${year}`}</Text>
            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={6}>
                <ArrowLeft width={24} height={24} />
              </Pressable>
              <Pressable style={styles.navBtn} onPress={() => shiftMonth(1)} hitSlop={6}>
                <ArrowLeft width={24} height={24} style={styles.flip} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.hint}>
            {!from ? 'Select start date' : !to ? 'Select end date' : ''}
          </Text>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => {
            const base = wi * 7;
            return (
              <View key={wi} style={styles.weekRow}>
                {week.map((cell, di) => {
                  const idx = base + di;
                  const d = dateOf(cell, idx);
                  const future = d.getTime() > today.getTime();
                  const endpoint = isEndpoint(d);
                  const mid = inRange(d);
                  return (
                    <Pressable
                      key={di}
                      style={styles.dayCell}
                      onPress={() => pick(d)}
                      disabled={future}
                    >
                      <View style={[styles.dayInner, mid && styles.dayInnerRange, endpoint && styles.dayInnerSel]}>
                        <Text
                          style={[
                            styles.dayText,
                            cell.offset !== 0 && styles.dayMuted,
                            future && styles.dayDisabled,
                            mid && styles.dayMidText,
                            endpoint && styles.dayEndText,
                          ]}
                        >
                          {d.getDate()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 343,
    backgroundColor: Colors.background,
    borderRadius: Radii.button,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 14, color: Colors.primaryText },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: Colors.primaryBgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flip: { transform: [{ rotate: '180deg' }] },
  hint: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  weekRow: { flexDirection: 'row', alignItems: 'center' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  dayInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayInnerRange: { backgroundColor: Colors.primaryBgLight, borderRadius: 8 },
  dayInnerSel: { backgroundColor: Colors.primary, borderRadius: 18 },
  dayText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  dayMuted: { color: '#6E6E6E' },
  dayDisabled: { color: Colors.lightGray },
  dayMidText: { color: Colors.primaryText, fontWeight: '600' },
  dayEndText: { color: Colors.white, fontWeight: '600' },
});
