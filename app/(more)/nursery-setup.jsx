import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSetup } from '../../context/SetupContext';
import * as ImagePicker from 'expo-image-picker';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Location from '../../assets/icons/location.svg';
import Target from '../../assets/icons/target.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import AuthImage from '../../components/AuthImage';
import GeofenceRadiusModal from '../../components/GeofenceRadiusModal';
import DaysModal from '../../components/DaysModal';
import HoursModal from '../../components/HoursModal';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import ErrorModal from '../../components/ErrorModal';
import {
  getNursery,
  updateNursery,
  updateGeofence,
  uploadLogo,
  toBackendTime,
  toBackendDays,
} from '../../services/nurseryService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_TIME = { hour: 8, minute: 0, period: 'AM' };

const formatJoined = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `Joined ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "HH:mm:ss" (24h) → { hour: 1-12, minute, period }
const parseTime = (t) => {
  if (!t) return null;
  const [hh, mm] = String(t).split(':').map(Number);
  const period = hh < 12 ? 'AM' : 'PM';
  return { hour: hh % 12 || 12, minute: mm || 0, period };
};

// "SATURDAY" → "Saturday"
const titleDay = (d) => d.charAt(0) + d.slice(1).toLowerCase();
const abbr = (d) => (d || '').slice(0, 3);
const fmtTime = (t) =>
  t ? `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')} ${t.period}` : '--:-- --';

export default function NurserySetup() {
  const router = useRouter();
  const setup = useSetup();
  const pendingLocationEdit = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [name, setName] = useState('');
  const [joined, setJoined] = useState('');
  const [logoUrl, setLogoUrl] = useState(null); // backend path
  const [logoAsset, setLogoAsset] = useState(null); // newly picked local image
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [radius, setRadius] = useState(100);
  const [days, setDays] = useState([]); // Title-case day names
  const [hours, setHours] = useState({ from: DEFAULT_TIME, to: DEFAULT_TIME });

  const [showRadius, setShowRadius] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [showHours, setShowHours] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const n = await getNursery();
      setName(n.name || '');
      setJoined(formatJoined(n.joinedAt));
      setLogoUrl(n.logoUrl || null);
      setLat(n.geofenceLat ?? null);
      setLng(n.geofenceLng ?? null);
      setRadius(n.geofenceRadiusM ?? 100);
      const coords =
        n.geofenceLat != null && n.geofenceLng != null
          ? `${n.geofenceLat.toFixed(5)}, ${n.geofenceLng.toFixed(5)}`
          : '—';
      setLocationText(n.locationText || coords);
      setDays(
        (n.workingDays || [])
          .map(titleDay)
          .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      );
      setHours({
        from: parseTime(n.hoursStart) || DEFAULT_TIME,
        to: parseTime(n.hoursEnd) || DEFAULT_TIME,
      });
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the nursery.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  // Open the map editor seeded with the nursery's current pin, then pick up the
  // edited location when we come back (staged locally until "Save Changes").
  const editLocation = () => {
    if (lat != null && lng != null) {
      setup.setLocation({ center: [lng, lat], placeName: locationText });
    }
    pendingLocationEdit.current = true;
    router.push('/edit-location');
  };

  useFocusEffect(
    useCallback(() => {
      if (pendingLocationEdit.current && setup.location?.center) {
        const [newLng, newLat] = setup.location.center;
        setLng(newLng);
        setLat(newLat);
        if (setup.location.placeName) setLocationText(setup.location.placeName);
        pendingLocationEdit.current = false;
      }
    }, [setup.location])
  );

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
    if (!result.canceled) setLogoAsset(result.assets[0]);
  };

  const daysLabel = days.length ? `${abbr(days[0])} - ${abbr(days[days.length - 1])}` : 'Not set';

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Hours + working days.
      await updateNursery({
        hoursStart: toBackendTime(hours.from),
        hoursEnd: toBackendTime(hours.to),
        workingDays: toBackendDays(days),
      });
      // Geofence radius (+ keep the existing center + location text).
      if (lat != null && lng != null) {
        await updateGeofence({ lat, lng, radiusM: radius, locationText });
      }
      // Logo, if a new one was picked.
      if (logoAsset) {
        await uploadLogo(logoAsset).catch(() => {});
        setLogoAsset(null);
      }
      await load();
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not save the changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Nursey Setup</Text>
        </View>
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

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
        {/* Logo + name + joined */}
        <View style={styles.profile}>
          <View style={styles.logoWrap}>
            {logoAsset ? (
              <Image source={{ uri: logoAsset.uri }} style={styles.logo} contentFit="cover" />
            ) : logoUrl ? (
              <AuthImage path={logoUrl} style={styles.logo} contentFit="cover" />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoInitial}>{(name || 'N')[0]}</Text>
              </View>
            )}
            <Pressable style={styles.logoEdit} onPress={pickLogo} hitSlop={6}>
              <EditIcon width={20} height={20} />
            </Pressable>
          </View>
          <Text style={styles.nurseryName}>{name || '—'}</Text>
          {!!joined && <Text style={styles.joined}>{joined}</Text>}
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Location</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nursery Location</Text>
            <View style={styles.valueBox}>
              <View style={styles.valueLeft}>
                <Location width={24} height={24} />
                <Text style={styles.valueText} numberOfLines={1}>{locationText || '—'}</Text>
              </View>
              <Pressable hitSlop={6} onPress={editLocation}>
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
                <Text style={styles.hourText} numberOfLines={1}>From: {fmtTime(hours?.from)}</Text>
                <ChevronDown width={20} height={20} />
              </Pressable>
              <Pressable style={styles.hourPill} onPress={() => setShowHours(true)}>
                <Text style={styles.hourText} numberOfLines={1}>To: {fmtTime(hours?.to)}</Text>
                <ChevronDown width={20} height={20} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, (saving || pressed) && styles.pressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.ctaText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
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

      <RoomArchivedModal
        visible={showSuccess}
        title="Nursery updated successfully!"
        onClose={() => setShowSuccess(false)}
      />

      <ErrorModal
        visible={(!!error && !loading) || !!notice}
        title={notice?.title || 'Something went wrong'}
        message={notice?.message || error}
        buttonText="OK"
        onClose={() => {
          setError(null);
          setNotice(null);
        }}
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
