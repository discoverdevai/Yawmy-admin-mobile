import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Location from '../../assets/icons/location.svg';
import Calendar from '../../assets/icons/calendar.svg';
import AuthImage from '../../components/AuthImage';
import DeleteChildModal from '../../components/DeleteChildModal';
import ErrorModal from '../../components/ErrorModal';
import { getEvent, deleteEvent } from '../../services/eventService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const eventFallback = require('../../assets/images/rooms/sunshine.png');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TYPE_LABELS = { HOLIDAY: 'Holiday', PARENT_TEACHER_MEETING: 'Parent Meeting' };

// "2024-03-30" + "22:30:00" -> "Mar 30- 10:30 PM"
const fmtWhen = (d, t) => {
  let datePart = '';
  if (d) {
    const [, m, day] = d.split('-').map(Number);
    if (m) datePart = `${MONTHS[m - 1]} ${day}`;
  }
  let timePart = '';
  if (t) {
    const [hh, mm] = t.split(':').map(Number);
    if (!Number.isNaN(hh)) {
      const period = hh < 12 ? 'AM' : 'PM';
      timePart = `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
    }
  }
  return [datePart, timePart].filter(Boolean).join('- ');
};

export default function EventDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvent(id);
      setItem(data);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the event.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/events');
  };

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteEvent(id);
      setShowDelete(false);
      router.replace('/events');
    } catch (e) {
      setShowDelete(false);
      setError(e.message || 'Could not delete the event.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const when = fmtWhen(item?.eventDate, item?.eventTime);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Event Details</Text>
      </View>

      {item && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Banner */}
          <View style={styles.banner}>
            <AuthImage path={item.imageUrl} fallback={eventFallback} style={styles.bannerImg} contentFit="cover" />
            <View style={styles.bannerOverlay} />
            {!!item.eventType && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{TYPE_LABELS[item.eventType] || item.eventType}</Text>
              </View>
            )}
          </View>

          {/* Title + description */}
          <View style={styles.body}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>

          {/* Meta pills */}
          <View style={styles.metaList}>
            <View style={styles.pill}>
              <Location width={24} height={24} />
              <Text style={styles.pillText}>At Nursery</Text>
            </View>
            {!!when && (
              <View style={styles.pill}>
                <Calendar width={24} height={24} />
                <Text style={styles.pillText}>{when}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Footer */}
      {item && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            onPress={() => setShowDelete(true)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/add-event', params: { id } })}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
      )}

      <DeleteChildModal
        visible={showDelete}
        title="Delete This Event?"
        message="Are you sure you want to delete this event? This action cannot be undone."
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />

      <ErrorModal
        visible={!!error && !loading}
        title="Something went wrong"
        message={error}
        buttonText="OK"
        onClose={() => {
          const wasLoadError = !item;
          setError(null);
          if (wasLoadError) goBack();
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

  content: { padding: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.lg },

  banner: { height: 149, borderRadius: Radii.button, overflow: 'hidden' },
  bannerImg: { ...StyleSheet.absoluteFillObject },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.2)' },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(226, 114, 91, 0.9)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  badgeText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 10, color: Colors.white },

  body: { gap: Spacing.sm + 4 },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  desc: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.gray, lineHeight: 24 },

  metaList: { gap: Spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: Colors.tapsBg,
  },
  pillText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.primaryText },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.lightRedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.redText },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
