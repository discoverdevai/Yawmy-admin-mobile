import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronDown from '../assets/icons/chevron-down.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const pad = (n) => String(n).padStart(2, '0');

function Stepper({ value, onUp, onDown }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onUp} hitSlop={6}>
        <ChevronDown width={24} height={24} style={styles.chevronUp} />
      </Pressable>
      <Text style={styles.stepNumber}>{value}</Text>
      <Pressable onPress={onDown} hitSlop={6}>
        <ChevronDown width={24} height={24} />
      </Pressable>
    </View>
  );
}

function TimeField({ label, side, value, onChange }) {
  const changeHour = (delta) => {
    let h = value.hour + delta;
    if (h > 12) h = 1;
    if (h < 1) h = 12;
    onChange({ ...value, hour: h });
  };
  const changeMinute = (delta) => {
    let m = value.minute + delta;
    if (m >= 60) m = 0;
    if (m < 0) m = 55;
    onChange({ ...value, minute: m });
  };
  const togglePeriod = () => onChange({ ...value, period: value.period === 'AM' ? 'PM' : 'AM' });

  return (
    <View style={styles.timeCol}>
      <View style={[styles.timeHeader, side === 'from' ? styles.roundTL : styles.roundTR]}>
        <Text style={styles.timeHeaderText}>{label}</Text>
      </View>
      <View style={[styles.timeBody, side === 'from' ? styles.roundBL : styles.roundBR]}>
        <Stepper value={pad(value.hour)} onUp={() => changeHour(1)} onDown={() => changeHour(-1)} />
        <Text style={styles.colon}>:</Text>
        <Stepper value={pad(value.minute)} onUp={() => changeMinute(5)} onDown={() => changeMinute(-5)} />
        <Pressable onPress={togglePeriod} hitSlop={6}>
          <Text style={styles.period}>{value.period === 'AM' ? 'Am' : 'Pm'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Bottom-sheet to edit the nursery's operating hours (From / To). Opens with the
 * current hours; Confirm reports the new { from, to }.
 */
export default function HoursModal({ visible, value, onClose, onConfirm }) {
  const [hours, setHours] = useState(value);

  useEffect(() => {
    if (visible) setHours(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!hours) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>Nursery Hours</Text>

              <View style={styles.timeRow}>
                <TimeField
                  label="From:"
                  side="from"
                  value={hours.from}
                  onChange={(v) => setHours((h) => ({ ...h, from: v }))}
                />
                <TimeField
                  label="To:"
                  side="to"
                  value={hours.to}
                  onChange={(v) => setHours((h) => ({ ...h, to: v }))}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onConfirm(hours)}
              >
                <Text style={styles.ctaText}>Confirm Hours</Text>
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
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  timeRow: { flexDirection: 'row' },
  timeCol: { flex: 1 },
  timeHeader: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: Colors.secBg,
    borderWidth: 0.5,
    borderColor: Colors.secBorder,
  },
  timeHeaderText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  timeBody: {
    height: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secBg,
    borderWidth: 0.5,
    borderColor: Colors.secBorder,
    borderTopWidth: 0,
  },
  roundTL: { borderTopLeftRadius: Radii.md },
  roundTR: { borderTopRightRadius: Radii.md },
  roundBL: { borderBottomLeftRadius: Radii.md },
  roundBR: { borderBottomRightRadius: Radii.md },
  stepper: { alignItems: 'center', gap: Spacing.xs },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  stepNumber: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 18, color: Colors.textBlack },
  colon: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 18, color: Colors.textBlack },
  period: { fontFamily: Fonts.medium, fontWeight: '600', fontSize: 16, color: Colors.gray },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
