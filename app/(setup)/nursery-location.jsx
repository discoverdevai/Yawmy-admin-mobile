import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox, { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';
import Location from '../../assets/icons/location.svg';
import MapPin from '../../assets/icons/map-pin.svg';
import RadiusSlider from '../../components/RadiusSlider';
import { useSetup } from '../../context/SetupContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// 6th of October City, Giza — [lng, lat]
const DEFAULT_CENTER = [30.9716, 29.9285];
const DEFAULT_PLACE = '6th of October City, Giza';
const RADIUS_STOPS = [50, 100, 200];

export default function NurseryLocation() {
  const router = useRouter();
  const setup = useSetup();
  const [center, setCenter] = useState(setup.location?.center ?? DEFAULT_CENTER);
  const [placeName, setPlaceName] = useState(
    setup.location?.placeName ?? DEFAULT_PLACE
  );
  const [radius, setRadius] = useState(setup.radius ?? 100);
  const geocodeTimer = useRef(null);

  const reverseGeocode = ([lng, lat]) => {
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1&language=en`
        );
        const data = await res.json();
        const feature = data?.features?.[0];
        if (feature) setPlaceName(feature.place_name || feature.text);
      } catch {
        // keep the previous label on failure
      }
    }, 500);
  };

  const handleCameraChanged = (state) => {
    const c = state?.properties?.center;
    if (!c) return;
    setCenter(c);
    reverseGeocode(c);
  };

  const handleConfirm = () => {
    setup.setLocation({ center, placeName });
    setup.setRadius(radius);
    router.push('/nursery-location-confirm');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stepperRow}>
          <View style={[styles.stepBar, styles.stepActive]} />
          <View style={[styles.stepBar, styles.stepActive]} />
          <View style={[styles.stepBar, styles.stepInactive]} />
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Nursery Location</Text>
          <Text style={styles.step}>Step 2 of 3</Text>
        </View>
        <Text style={styles.subtitle}>
          Pin your nursery on the map and define the allowed check-in area.
        </Text>
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={StyleSheet.absoluteFill}
          styleURL={Mapbox.StyleURL.Street}
          scaleBarEnabled={false}
          onCameraChanged={handleCameraChanged}
        >
          <Mapbox.Camera
            defaultSettings={{ centerCoordinate: center, zoomLevel: 13 }}
          />
        </Mapbox.MapView>

        {/* Location label chip */}
        <View style={styles.labelWrap} pointerEvents="none">
          <View style={styles.labelChip}>
            <Location width={24} height={24} />
            <Text style={styles.labelText} numberOfLines={1}>
              {placeName}
            </Text>
          </View>
        </View>

        {/* Center pin + geofence circle */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <View style={styles.geofenceCircle}>
            <MapPin width={33} height={40} />
          </View>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Geofence Radius</Text>
          <Text style={styles.sheetSubtitle}>
            Automatic Check in range {radius} m
          </Text>
        </View>

        <View style={styles.valueBox}>
          <Location width={24} height={24} />
          <Text style={styles.valueText}>{radius} m</Text>
        </View>

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
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleConfirm}
        >
          <Text style={styles.buttonText}>Confirm Location</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  stepperRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  stepBar: { flex: 1, height: 2, borderRadius: Radii.full },
  stepActive: { backgroundColor: Colors.primary },
  stepInactive: { backgroundColor: Colors.tapsBg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
  },
  step: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
  },

  // Map
  mapWrap: { flex: 1, overflow: 'hidden' },
  labelWrap: {
    position: 'absolute',
    top: Spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    maxWidth: '88%',
    backgroundColor: Colors.background,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm,
    height: 40,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  labelText: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.textBlack,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geofenceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(118, 148, 92, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom sheet
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  sheetHeader: { gap: Spacing.sm },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  sheetSubtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
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
  valueText: {
    fontFamily: Fonts.medium,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  sliderBlock: { gap: Spacing.sm + 4 },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.textBlack,
  },

  // Confirm
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
