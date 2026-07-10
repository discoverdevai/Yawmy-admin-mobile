import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Location from '../../assets/icons/location.svg';
import Target from '../../assets/icons/target.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import GeofenceRadiusModal from '../../components/GeofenceRadiusModal';
import DaysModal from '../../components/DaysModal';
import HoursModal from '../../components/HoursModal';
import ErrorModal from '../../components/ErrorModal';
import { useSetup } from '../../context/SetupContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const abbr = (d) => (d || '').slice(0, 3);

const fmtTime = (t) => {
  if (!t) return '--:-- --';
  const h = String(t.hour).padStart(2, '0');
  const m = String(t.minute).padStart(2, '0');
  return `${h}:${m} ${t.period}`;
};

export default function NurserySetup() {
  const router = useRouter();
  const { nurseryName, logo, setLogo, location, radius, setRadius, days, setDays, hours, setHours } =
    useSetup();
  const [showRadius, setShowRadius] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [notice, setNotice] = useState(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  // Open the gallery to pick a new nursery icon.
  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setNotice({ title: 'Permission needed', message: 'Please allow photo access to choose a nursery icon.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      selectionLimit: 1,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setLogo(result.assets[0].uri);
  };

  const daysLabel = days.length
    ? `${abbr(days[0])}: ${abbr(days[days.length - 1])}`
    : 'Not set';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Nursey Setup</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo + name */}
        <View style={styles.profile}>
          <View style={styles.logoWrap}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} contentFit="cover" />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoInitial}>{(nurseryName || 'N')[0]}</Text>
              </View>
            )}
            <Pressable style={styles.logoEdit} onPress={pickLogo} hitSlop={6}>
              <EditIcon width={20} height={20} />
            </Pressable>
          </View>
          <Text style={styles.nurseryName}>{nurseryName || 'Bunny Steps Nursery'}</Text>
          <Text style={styles.joined}>Joined 15 Aug 2020</Text>
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Location</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nursery Location</Text>
            <View style={styles.valueBox}>
              <View style={styles.valueLeft}>
                <Location width={24} height={24} />
                <Text style={styles.valueText} numberOfLines={1}>
                  {location?.placeName || '6th of October City, Giza'}
                </Text>
              </View>
              <Pressable hitSlop={6} onPress={() => router.push('/edit-location')}>
                <EditIcon width={24} height={24} />
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Geofence Radius</Text>
            <View style={styles.valueBox}>
              <View style={styles.valueLeft}>
                <Target width={24} height={24} />
                <Text style={styles.valueText}>{radius} m</Text>
              </View>
              <Pressable hitSlop={6} onPress={() => setShowRadius(true)}>
                <EditIcon width={24} height={24} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Operating hours card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Operating Hours</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Days of the Week</Text>
            <Pressable style={styles.selectBox} onPress={() => setShowDays(true)}>
              <Text style={styles.selectText}>{daysLabel}</Text>
              <ChevronDown width={24} height={24} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nursery Hours</Text>
            <View style={styles.hoursRow}>
              <Pressable style={styles.hourPill} onPress={() => setShowHours(true)}>
                <Text style={styles.hourText} numberOfLines={1}>
                  From: {fmtTime(hours?.from)}
                </Text>
                <ChevronDown width={20} height={20} />
              </Pressable>
              <Pressable style={styles.hourPill} onPress={() => setShowHours(true)}>
                <Text style={styles.hourText} numberOfLines={1}>
                  To: {fmtTime(hours?.to)}
                </Text>
                <ChevronDown width={20} height={20} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={goBack}>
          <Text style={styles.ctaText}>Save Changes</Text>
        </Pressable>
      </View>

      <GeofenceRadiusModal
        visible={showRadius}
        value={radius}
        onClose={() => setShowRadius(false)}
        onConfirm={(v) => {
          setRadius(v);
          setShowRadius(false);
        }}
      />

      <DaysModal
        visible={showDays}
        value={days}
        onClose={() => setShowDays(false)}
        onConfirm={(d) => {
          setDays(d);
          setShowDays(false);
        }}
      />

      <HoursModal
        visible={showHours}
        value={hours}
        onClose={() => setShowHours(false)}
        onConfirm={(h) => {
          setHours(h);
          setShowHours(false);
        }}
      />

      <ErrorModal
        visible={!!notice}
        title={notice?.title}
        message={notice?.message}
        buttonText="OK"
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  content: { padding: Spacing.md, gap: Spacing.lg },

  profile: { alignItems: 'center', gap: Spacing.md },
  logoWrap: { width: 100, height: 100 },
  logo: { width: 100, height: 100, borderRadius: Radii.button, borderWidth: 2, borderColor: Colors.accent },
  logoFallback: { backgroundColor: Colors.secBg, alignItems: 'center', justifyContent: 'center' },
  logoInitial: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 40, color: Colors.accent },
  logoEdit: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nurseryName: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 18, color: Colors.textBlack },
  joined: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray, marginTop: -Spacing.sm },

  card: {
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
  },
  cardLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  fieldGroup: { gap: Spacing.sm + 4 },
  fieldLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },

  valueBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
  },
  valueLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  valueText: { flexShrink: 1, fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.textBlack },

  selectBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm + 4,
  },
  selectText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  hoursRow: { flexDirection: 'row', gap: Spacing.sm },
  hourPill: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  hourText: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
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
