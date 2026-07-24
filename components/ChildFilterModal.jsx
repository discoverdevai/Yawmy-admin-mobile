import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reset from '../assets/icons/reset.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const AGE_MIN = 3; // months
const AGE_MAX = 48; // 4 years

export const formatAge = (months) => {
  if (months < 12) return `${months} Months`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y}Yr.` : `${y}Yr.${m}Mon`;
};

// Lightweight touch slider (no extra deps) — month-by-month from 3mo to 4yr.
function AgeSlider({ value, onChange }) {
  const [trackW, setTrackW] = useState(0);
  const v = value ?? AGE_MIN;
  const ratio = (v - AGE_MIN) / (AGE_MAX - AGE_MIN);
  const knobLeft = trackW * ratio;

  const handle = (x) => {
    if (!trackW) return;
    const clamped = Math.max(0, Math.min(trackW, x));
    const months = Math.round(AGE_MIN + (clamped / trackW) * (AGE_MAX - AGE_MIN));
    onChange(months);
  };

  return (
    <View style={styles.sliderWrap}>
      {/* Tooltip bubble above the knob */}
      <View style={[styles.tooltip, { left: Math.max(0, Math.min(knobLeft - 26, trackW - 52)) }]}>
        <Text style={styles.tooltipText}>{formatAge(v)}</Text>
      </View>

      <View
        style={styles.sliderTrack}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handle(e.nativeEvent.locationX)}
        onResponderMove={(e) => handle(e.nativeEvent.locationX)}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: knobLeft }]} />
        <View style={[styles.knob, { left: knobLeft - 9 }]} />
      </View>

      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>3 Months</Text>
        <Text style={styles.sliderLabel}>4 Years</Text>
      </View>
    </View>
  );
}

/**
 * Children filter: by rooms (multi) and an age slider (age is derived from the
 * child's date of birth). Opens with nothing selected.
 */
export default function ChildFilterModal({
  visible,
  rooms = [],
  initial = { rooms: [], ageMonths: null },
  onClose,
  onApply,
}) {
  const [selRooms, setSelRooms] = useState([]);
  const [ageMonths, setAgeMonths] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setSelRooms(initial.rooms || []);
    setAgeMonths(initial.ageMonths ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggleRoom = (r) =>
    setSelRooms((list) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]));

  const count = selRooms.length + (ageMonths != null ? 1 : 0);

  const resetAll = () => {
    setSelRooms([]);
    setAgeMonths(null);
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

                {/* By age */}
                <View style={[styles.section, styles.sectionLast]}>
                  <Text style={styles.sectionLabel}>By Age</Text>
                  <AgeSlider value={ageMonths} onChange={setAgeMonths} />
                </View>
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onApply({ rooms: selRooms, ageMonths })}
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

  section: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    marginBottom: Spacing.md,
  },
  sectionLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
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

  sliderWrap: { paddingTop: 28 },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: 52,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  tooltipText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 8, color: Colors.white },
  sliderTrack: { height: 24, justifyContent: 'center' },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  trackFill: { height: 4, borderRadius: 100, backgroundColor: Colors.primary },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  sliderLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 10, color: Colors.textBlack },

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
