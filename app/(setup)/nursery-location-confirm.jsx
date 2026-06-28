import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '../../config/mapbox';
import Location from '../../assets/icons/location.svg';
import MapPin from '../../assets/icons/map-pin.svg';
import Edit from '../../assets/icons/edit.svg';
import { useSetup } from '../../context/SetupContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const DEFAULT_CENTER = [30.9716, 29.9285];
const DEFAULT_PLACE = '6th of October City, Giza';

export default function NurseryLocationConfirm() {
  const router = useRouter();
  const { location } = useSetup();

  const center = location?.center ?? DEFAULT_CENTER;
  const placeName = location?.placeName ?? DEFAULT_PLACE;

  const goPrevious = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/nursery-location');
  };

  const goNext = () => {
    router.push('/nursery-hours');
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

      {/* Map preview (read-only) */}
      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={StyleSheet.absoluteFill}
          styleURL={Mapbox.StyleURL.Street}
          scaleBarEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Mapbox.Camera
            defaultSettings={{ centerCoordinate: center, zoomLevel: 13 }}
          />
        </Mapbox.MapView>

        {/* Edit button */}
        <Pressable
          style={styles.editBtn}
          onPress={goPrevious}
          accessibilityRole="button"
          accessibilityLabel="Edit location"
        >
          <Edit width={24} height={24} />
        </Pressable>

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

      {/* Footer: Previous / Next */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.outlineButton,
            pressed && styles.pressed,
          ]}
          onPress={goPrevious}
        >
          <Text style={styles.outlineText}>Previous</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={goNext}
        >
          <Text style={styles.buttonText}>Next</Text>
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
  editBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    top: 64,
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

  // Footer
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  outlineButton: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.primary,
  },
  button: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  pressed: { opacity: 0.85 },
});
