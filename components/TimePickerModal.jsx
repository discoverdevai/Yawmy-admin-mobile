import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const SIZE = 240;
const CENTER = SIZE / 2;
const NUM_R = 96;
const BOX = 36;
const HAND = NUM_R - 2;

const pad = (n) => String(n).padStart(2, '0');

const markPos = (markIndex) => {
  const theta = (markIndex * 30 * Math.PI) / 180; // 0 at 12 o'clock, clockwise
  const x = CENTER + NUM_R * Math.sin(theta) - BOX / 2;
  const y = CENTER - NUM_R * Math.cos(theta) - BOX / 2;
  return { left: x, top: y };
};

function parse(initial) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(initial || '');
  if (!m) return { hour: 7, minute: 0, period: 'AM' };
  return { hour: Number(m[1]) || 12, minute: Number(m[2]) || 0, period: m[3].toUpperCase() };
}

export default function TimePickerModal({ visible, initial, onCancel, onConfirm }) {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');
  const [editing, setEditing] = useState('hour'); // 'hour' | 'minute'

  useEffect(() => {
    if (visible) {
      const p = parse(initial);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
      setEditing('hour');
    }
  }, [visible, initial]);

  const isHour = editing === 'hour';
  const marks = isHour
    ? Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
    : Array.from({ length: 12 }, (_, i) => ({ value: i * 5, label: pad(i * 5) }));
  const handTheta = isHour ? (hour % 12) * 30 : minute * 6;

  const pickMark = (value) => {
    if (isHour) {
      setHour(value);
      setEditing('minute');
    } else {
      setMinute(value);
    }
  };

  const confirm = () => onConfirm(`${pad(hour)}:${pad(minute)} ${period}`);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.card}>
          <Text style={styles.title}>Select Time</Text>

          {/* Hour : Minute  +  AM/PM */}
          <View style={styles.selectorRow}>
            <Pressable
              style={[styles.unitBox, isHour && styles.unitBoxOn]}
              onPress={() => setEditing('hour')}
            >
              <Text style={[styles.unitText, isHour && styles.unitTextOn]}>{pad(hour)}</Text>
            </Pressable>
            <Text style={styles.colon}>:</Text>
            <Pressable
              style={[styles.unitBox, !isHour && styles.unitBoxOn]}
              onPress={() => setEditing('minute')}
            >
              <Text style={[styles.unitText, !isHour && styles.unitTextOn]}>{pad(minute)}</Text>
            </Pressable>

            <View style={styles.period}>
              <Pressable
                style={[styles.periodSeg, styles.periodTop, period === 'AM' && styles.periodOn]}
                onPress={() => setPeriod('AM')}
              >
                <Text style={[styles.periodText, period === 'AM' && styles.periodTextOn]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.periodSeg, styles.periodBottom, period === 'PM' && styles.periodOn]}
                onPress={() => setPeriod('PM')}
              >
                <Text style={[styles.periodText, period === 'PM' && styles.periodTextOn]}>PM</Text>
              </Pressable>
            </View>
          </View>

          {/* Clock face */}
          <View style={styles.clock}>
            {/* hand */}
            <View style={[styles.handWrap, { transform: [{ rotate: `${handTheta}deg` }] }]}>
              <View style={styles.hand} />
            </View>
            <View style={styles.centerDot} />

            {marks.map((m, i) => {
              const selected = m.value === (isHour ? hour : minute);
              return (
                <Pressable
                  key={m.label}
                  style={[styles.mark, markPos(isHour ? i + 1 : i), selected && styles.markOn]}
                  onPress={() => pickMark(m.value)}
                >
                  <Text style={[styles.markText, selected && styles.markTextOn]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={confirm}>
              <Text style={styles.okText}>OK</Text>
            </Pressable>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    gap: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    alignSelf: 'flex-start',
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.textBlack,
  },

  // Hour/minute/period selector
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  unitBox: {
    width: 68,
    height: 82,
    borderRadius: Radii.button,
    backgroundColor: Colors.tapsBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBoxOn: {
    backgroundColor: Colors.primaryBgLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  unitText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 20, color: Colors.gray },
  unitTextOn: { color: Colors.primaryText },
  colon: { fontFamily: Fonts.regular, fontSize: 40, color: Colors.gray },
  period: { width: 56, height: 82, borderRadius: Radii.button, overflow: 'hidden' },
  periodSeg: { flex: 1, backgroundColor: Colors.tapsBg, alignItems: 'center', justifyContent: 'center' },
  periodTop: {},
  periodBottom: {},
  periodOn: { backgroundColor: Colors.primary },
  periodText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  periodTextOn: { color: Colors.white },

  // Clock
  clock: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#ECECF3',
  },
  handWrap: { position: 'absolute', width: SIZE, height: SIZE },
  hand: {
    position: 'absolute',
    left: CENTER - 1,
    top: CENTER - HAND,
    width: 2,
    height: HAND,
    backgroundColor: Colors.primary,
  },
  centerDot: {
    position: 'absolute',
    left: CENTER - 4,
    top: CENTER - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  mark: {
    position: 'absolute',
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { backgroundColor: Colors.primary },
  markText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  markTextOn: { color: Colors.white },

  // Actions
  actions: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: Spacing.lg },
  actionBtn: { height: 40, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  cancelText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  okText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.primary },
});
