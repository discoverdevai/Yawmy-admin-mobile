import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Notification from '../../assets/icons/notification.svg';
import Calendar from '../../assets/icons/calendar.svg';
import StatChildren from '../../assets/icons/stat-children.svg';
import StatTeacher from '../../assets/icons/stat-teacher.svg';
import StatCheck from '../../assets/icons/stat-check.svg';
import StatReport from '../../assets/icons/stat-report.svg';
import BottomTabBar from '../../components/BottomTabBar';
import { useSetup } from '../../context/SetupContext';
import { useNotifications } from '../../context/NotificationsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatar = require('../../assets/images/avatar-demo.png');

const STATS = [
  { id: 'children', title: 'Total Children', value: '20 Child', cardBg: '#FFFFE8', iconBg: '#898900', Icon: StatChildren },
  { id: 'teachers', title: 'Total teachers', value: '20 Teacher', cardBg: '#EAF2E1', iconBg: '#4D8F00', Icon: StatTeacher },
  { id: 'checked', title: 'Checked In', value: '20 Child', cardBg: '#FFF3DC', iconBg: '#E2725B', Icon: StatCheck },
  { id: 'incident', title: 'Incident Reports', value: '20 Report', cardBg: '#F2F2F2', iconBg: '#5000F1', Icon: StatReport },
];

const ATTENDANCE = [
  { label: 'Sat', value: 13 },
  { label: 'Sun', value: 7 },
  { label: 'Mon', value: 18 },
  { label: 'Tue', value: 20 },
  { label: 'Wed', value: 16 },
  { label: 'Thu', value: 9 },
];

const ACTIVITY = [
  { title: 'Attendance Updated', desc: 'Today’s attendance has been recorded for all classes.' },
  { title: 'New Parent Invitation Accepted', desc: 'A parent has joined and completed their onboarding process.' },
  { title: 'Staff Action Completed', desc: 'Today’s class activities were updated in sunflower room by a teacher.' },
];

const CHART_HEIGHT = 190;
const CHART_MAX = 20;

function DateChip({ text }) {
  return (
    <View style={styles.dateChip}>
      <Calendar width={16} height={16} />
      <Text style={styles.dateChipText}>{text}</Text>
    </View>
  );
}

function StatCard({ title, value, cardBg, iconBg, Icon }) {
  return (
    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Icon width={24} height={24} />
      </View>
      <View style={styles.statText}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function BarChart({ data }) {
  return (
    <View>
      <View style={styles.chartRow}>
        <View style={styles.yAxis}>
          {[20, 15, 10, 5, 0].map((v) => (
            <Text key={v} style={styles.axisLabel}>
              {v}
            </Text>
          ))}
        </View>
        <View style={styles.plot}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.gridLine, { top: (i * CHART_HEIGHT) / 4 }]} />
          ))}
          <View style={styles.bars}>
            {data.map((d) => (
              <View key={d.label} style={styles.barCol}>
                <View style={[styles.bar, { height: (d.value / CHART_MAX) * CHART_HEIGHT }]}>
                  <Text style={styles.barValue}>{d.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.xAxis}>
        {data.map((d) => (
          <Text key={d.label} style={styles.xLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ActivityCard({ title, desc }) {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityText}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityDesc}>{desc}</Text>
      </View>
      <View style={styles.activityIcon}>
        <StatReport width={24} height={24} />
      </View>
    </View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { nurseryName } = useSetup();
  const { unreadCount } = useNotifications();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 96 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.header}>
          <Pressable
            style={styles.profile}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Image source={avatar} style={styles.avatar} contentFit="cover" />
            <View style={styles.profileText}>
              <Text style={styles.name}>Hanna Calzoni</Text>
              <Text style={styles.nursery}>{nurseryName || 'Nursery name'}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Notification width={24} height={24} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <DateChip text="April, 5, 2026" />
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <StatCard {...STATS[0]} />
              <StatCard {...STATS[1]} />
            </View>
            <View style={styles.statRow}>
              <StatCard {...STATS[2]} />
              <StatCard {...STATS[3]} />
            </View>
          </View>
        </View>

        {/* Daily Attendance */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Daily Attendance</Text>
            <DateChip text="April 2026" />
          </View>
          <BarChart data={ATTENDANCE} />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {ACTIVITY.map((a) => (
              <ActivityCard key={a.title} title={a.title} desc={a.desc} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom tab bar */}
      <BottomTabBar active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  profile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  profileText: { gap: 6 },
  name: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  nursery: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.gray },
  notifBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentBgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 10,
    color: Colors.white,
  },

  // Sections
  section: { gap: Spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secStroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  dateChipText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.textBlack,
  },

  // Stat cards
  statsGrid: { gap: Spacing.sm + 4 },
  statRow: { flexDirection: 'row', gap: Spacing.sm + 4 },
  statCard: {
    flex: 1,
    height: 110,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    justifyContent: 'space-between',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: { gap: Spacing.xs },
  statTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
  },
  statValue: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.gray },

  // Bar chart
  chartRow: { flexDirection: 'row', height: CHART_HEIGHT + 4 },
  yAxis: {
    width: 26,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
  },
  axisLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.gray },
  plot: { flex: 1, height: CHART_HEIGHT, position: 'relative' },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E6E6D8',
  },
  bars: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barCol: { flex: 1, alignItems: 'center' },
  bar: {
    width: 34,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(118, 148, 92, 0.22)',
    alignItems: 'center',
    paddingTop: 6,
  },
  barValue: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 10,
    color: Colors.primaryText,
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    paddingLeft: 26,
  },
  xLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.gray,
  },

  // Activity
  activityList: { gap: Spacing.sm + 4 },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentBgLight,
    borderWidth: 1,
    borderColor: Colors.accentStroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
  },
  activityText: { flex: 1, gap: Spacing.xs },
  activityTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  activityDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tab bar
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secStroke,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  tabLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.gray },
  tabLabelActive: { color: Colors.primary },
  spotlightWrap: { flex: 1, alignItems: 'center' },
  spotlightRing: {
    marginTop: -32,
    padding: 4,
    borderRadius: 100,
    backgroundColor: Colors.background,
  },
  spotlight: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00AA5B',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
