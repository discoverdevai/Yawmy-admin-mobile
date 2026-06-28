import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Location from '../../assets/icons/location.svg';
import Calendar from '../../assets/icons/calendar.svg';
import { useEvents } from '../../context/EventsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function Events() {
  const router = useRouter();
  const { events: EVENTS } = useEvents();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {EVENTS.map((e) => (
          <Pressable
            key={e.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push({ pathname: '/event-details', params: { id: e.id } })}
          >
            {/* Banner */}
            <View style={styles.banner}>
              <Image source={e.image} style={styles.bannerImg} contentFit="cover" />
              <View style={styles.bannerOverlay} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{e.category}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.infoText}>
                <Text style={styles.title}>{e.title}</Text>
                <Text style={styles.desc}>{e.desc}</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Location width={16} height={16} />
                  <Text style={styles.metaText}>{e.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Calendar width={16} height={16} />
                  <Text style={styles.metaText}>{e.date}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={() => router.push('/add-event')}
        >
          <Text style={styles.ctaText}>Add New Event</Text>
        </Pressable>
      </View>
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

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.lg, gap: Spacing.md },
  card: { borderRadius: Radii.button, overflow: 'hidden' },
  cardPressed: { opacity: 0.9 },

  banner: { height: 111, borderTopLeftRadius: Radii.button, borderTopRightRadius: Radii.button, overflow: 'hidden' },
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

  info: {
    gap: Spacing.sm,
    padding: Spacing.sm + 4,
    backgroundColor: Colors.primaryBgLight,
    borderBottomLeftRadius: Radii.button,
    borderBottomRightRadius: Radii.button,
  },
  infoText: { gap: Spacing.xs },
  title: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  desc: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, lineHeight: 18 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.primaryText },

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
