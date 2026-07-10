import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Location from '../../assets/icons/location.svg';
import Calendar from '../../assets/icons/calendar.svg';
import SuccessModal from '../../components/SuccessModal';
import { useEvents } from '../../context/EventsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const fallbackImage = require('../../assets/images/rooms/sunshine.png');

export default function EventPreview() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addEvent, updateEvent } = useEvents();
  const [showSuccess, setShowSuccess] = useState(false);

  let data = {};
  try {
    data = params.data ? JSON.parse(params.data) : {};
  } catch {
    data = {};
  }
  const { id, category, title = '', desc = '', location = 'At Nursery', date = '', image } = data;
  const banner = image || fallbackImage;

  // Auto-dismiss the success popup and return to the events list.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.dismissTo('/events'), 2000);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/add-event');
  };

  const publish = () => {
    const event = { category, title, desc, location, date, image: banner };
    if (id) updateEvent(id, event);
    else addEvent(event);
    setShowSuccess(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Event Preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          <Image source={banner} style={styles.bannerImg} contentFit="cover" />
          <View style={styles.bannerOverlay} />
          {!!category && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
          )}
        </View>

        {/* Title + description */}
        <View style={styles.body}>
          <Text style={styles.title}>{title || 'Event title'}</Text>
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
        <Pressable style={({ pressed }) => [styles.cta, pressed && styles.pressed]} onPress={publish}>
          <Text style={styles.ctaText}>Publish</Text>
        </Pressable>
      </View>

      <SuccessModal
        visible={showSuccess}
        title={id ? 'Event Updated Successfully!' : 'Event Shared Successfully!'}
        message=""
        buttonText=""
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
