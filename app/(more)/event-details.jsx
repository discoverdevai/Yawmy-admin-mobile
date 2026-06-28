import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Location from '../../assets/icons/location.svg';
import Calendar from '../../assets/icons/calendar.svg';
import DeleteChildModal from '../../components/DeleteChildModal';
import { useEvents } from '../../context/EventsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function EventDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { events, deleteEvent } = useEvents();
  const [showDelete, setShowDelete] = useState(false);

  const item = events.find((e) => e.id === id) || events[0];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/events');
  };

  const confirmDelete = () => {
    setShowDelete(false);
    deleteEvent(item.id);
    router.replace('/events');
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Event Details</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { category, title, desc, location = 'At Nursery', date, image } = item;

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Image source={image} style={styles.bannerImg} contentFit="cover" />
          <View style={styles.bannerOverlay} />
          {!!category && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
          )}
        </View>

        {/* Title + description */}
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{desc}</Text>
        </View>

        {/* Meta pills */}
        <View style={styles.metaList}>
          <View style={styles.pill}>
            <Location width={24} height={24} />
            <Text style={styles.pillText}>{location}</Text>
          </View>
          {!!date && (
            <View style={styles.pill}>
              <Calendar width={24} height={24} />
              <Text style={styles.pillText}>{date}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
          onPress={() => setShowDelete(true)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/add-event', params: { id: item.id } })}
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      <DeleteChildModal
        visible={showDelete}
        title="Delete This Event?"
        message="Are you sure you want to delete this event? This action cannot be undone."
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
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
