import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Location from '../assets/icons/location.svg';
import RadiusSlider from './RadiusSlider';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const RADIUS_STOPS = [50, 100, 200];

/**
 * Bottom-sheet to edit the geofence radius (Figma 598-115905). Opens at the
 * current value; Confirm reports the new value.
 */
export default function GeofenceRadiusModal({ visible, value, onClose, onConfirm }) {
  const [radius, setRadius] = useState(value ?? 100);

  useEffect(() => {
    if (visible) setRadius(value ?? 100);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <View style={styles.head}>
                <Text style={styles.title}>Geofence Radius</Text>
                <Text style={styles.subtitle}>Automatic Check in range {radius}m</Text>
              </View>

              {/* Current value */}
              <View style={styles.valueBox}>
                <Location width={24} height={24} />
                <Text style={styles.valueText}>{radius} m</Text>
              </View>

              {/* Slider */}
              <View style={styles.sliderBlock}>
                <RadiusSlider values={RADIUS_STOPS} value={radius} onChange={setRadius} />
                <View style={styles.sliderLabels}>
                  {RADIUS_STOPS.map((v) => (
                    <Text key={v} style={styles.sliderLabel}>
                      {v} m
                    </Text>
                  ))}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onConfirm(radius)}
              >
                <Text style={styles.ctaText}>Confirm Geofence Radius</Text>
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
  head: { gap: Spacing.sm },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  subtitle: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  valueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.lightGreen,
  },
  valueText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },

  sliderBlock: { gap: Spacing.sm + 4, paddingVertical: Spacing.sm },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.textBlack },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
