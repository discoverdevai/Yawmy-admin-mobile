import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import ArrowLeft from '../assets/icons/arrow-left.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

// Format a Date for output, in the caller's chosen style.
const fmt = (d, format) =>
  format === 'DD MMM YYYY'
    ? `${pad(d.getDate())} ${MONTHS_ABBR[d.getMonth()]} ${d.getFullYear()}`
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

// Parse "DD/MM/YYYY" or "DD MMM YYYY" (e.g. 15 Aug 2020) → Date, or null.
const parse = (s) => {
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(s || '');
  if (m) {
    const mon = MONTHS_ABBR.findIndex((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (mon >= 0) return new Date(Number(m[3]), mon, Number(m[1]));
  }
  return null;
};

/**
 * Centered month calendar (Figma 598-114724). Navigate months with the arrows;
 * tapping a day returns it as "DD/MM/YYYY". Background is dimmed.
 */
export default function DatePickerModal({ visible, value, onClose, onSelect, format = 'DD/MM/YYYY', maxDate }) {
  const [view, setView] = useState({ year: 2016, month: 11 }); // {year, month 0-based}

  const max = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null;
  const maxDay = max ? max.getTime() : null;

  useEffect(() => {
    if (!visible) return;
    const base = parse(value) || (maxDay != null ? new Date(maxDay) : new Date());
    setView({ year: base.getFullYear(), month: base.getMonth() });
  }, [visible, value, maxDay]);

  const isDisabled = (d) => !!max && d > max;
  const atMaxMonth = !!max && (view.year > max.getFullYear()
    || (view.year === max.getFullYear() && view.month >= max.getMonth()));

  const selected = parse(value);
  const sameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const shiftMonth = (delta) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  // Build a Sunday-first grid covering the month, with leading/trailing days.
  const { year, month } = view;
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ offset: -1, day: 0 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ offset: 0, day: d });
  while (cells.length % 7 !== 0) cells.push({ offset: 1, day: 0 });

  // Resolve a cell to an actual Date (handles leading/trailing months).
  const dateOf = (cell, idx) => {
    if (cell.offset === 0) return new Date(year, month, cell.day);
    // leading: count back from the 1st; trailing: count forward from last day
    if (cell.offset === -1) return new Date(year, month, 1 - (startDow - idx));
    return new Date(year, month, daysInMonth + (idx - (startDow + daysInMonth)) + 1);
  };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const pick = (cell, idx) => {
    const d = dateOf(cell, idx);
    onSelect(fmt(d, format));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header */}
          <View style={styles.head}>
            <Text style={styles.monthLabel}>{`${MONTHS[month]} ${year}`}</Text>
            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={6}>
                <ArrowLeft width={24} height={24} />
              </Pressable>
              <Pressable
                style={[styles.navBtn, atMaxMonth && styles.navBtnDisabled]}
                onPress={() => shiftMonth(1)}
                disabled={atMaxMonth}
                hitSlop={6}
              >
                <ArrowLeft width={24} height={24} style={styles.flip} />
              </Pressable>
            </View>
          </View>

          {/* Weekday header */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          {weeks.map((week, wi) => {
            const base = wi * 7;
            return (
              <View key={wi} style={styles.weekRow}>
                {week.map((cell, di) => {
                  const idx = base + di;
                  const d = dateOf(cell, idx);
                  const isSel = sameDay(d, selected);
                  const off = isDisabled(d);
                  return (
                    <Pressable key={di} style={styles.dayCell} onPress={() => pick(cell, idx)} disabled={off}>
                      <View style={[styles.dayInner, isSel && styles.dayInnerSel]}>
                        <Text
                          style={[
                            styles.dayText,
                            cell.offset !== 0 && styles.dayMuted,
                            off && styles.dayDisabled,
                            isSel && styles.daySelText,
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
    gap: Spacing.md,
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
  navBtnDisabled: { opacity: 0.4 },
  flip: { transform: [{ rotate: '180deg' }] },

  weekRow: { flexDirection: 'row', alignItems: 'center' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.gray,
  },
  dayCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 36 },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSel: { backgroundColor: Colors.primaryBg },
  dayText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  dayMuted: { color: '#6E6E6E' },
  dayDisabled: { color: '#C8C8C8' },
  daySelText: { color: Colors.primaryText, fontWeight: '600' },
});
