import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox, { MAPBOX_ACCESS_TOKEN } from '../../config/mapbox';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Location from '../../assets/icons/location.svg';
import MapPin from '../../assets/icons/map-pin.svg';
import { useSetup } from '../../context/SetupContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// 6th of October City, Giza — [lng, lat]
const DEFAULT_CENTER = [30.9716, 29.9285];
const DEFAULT_PLACE = '6th of October City, Giza';

export default function EditLocation() {
  const router = useRouter();
  const setup = useSetup();
  // Start the pin at the location the admin saved during setup.
  const [center, setCenter] = useState(setup.location?.center ?? DEFAULT_CENTER);
  const [placeName, setPlaceName] = useState(setup.location?.placeName ?? DEFAULT_PLACE);
  const geocodeTimer = useRef(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/nursery-setup');
  };

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

  const handleSave = () => {
    setup.setLocation({ center, placeName });
    goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.title}>Edit Nursery Location</Text>
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
          <Mapbox.Camera defaultSettings={{ centerCoordinate: center, zoomLevel: 13 }} />
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

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSave}
        >
          <Text style={styles.buttonText}>Save Location</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    paddingLeft: 52,
  },

  mapWrap: { flex: 1, overflow: 'hidden' },
  labelWrap: { position: 'absolute', top: Spacing.md, left: 0, right: 0, alignItems: 'center' },
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

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
