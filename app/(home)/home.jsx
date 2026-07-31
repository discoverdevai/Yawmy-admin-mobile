import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Notification from '../../assets/icons/notification.svg';
import Calendar from '../../assets/icons/calendar.svg';
import StatChildren from '../../assets/icons/stat-children.svg';
import StatTeacher from '../../assets/icons/stat-teacher.svg';
import StatCheck from '../../assets/icons/stat-check.svg';
import StatReport from '../../assets/icons/stat-report.svg';
import BottomTabBar from '../../components/BottomTabBar';
import AuthImage from '../../components/AuthImage';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationsContext';
import { getDashboard } from '../../services/nurseryService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatar = require('../../assets/images/avatar-demo.png');

// Card look stays fixed; the value comes from the dashboard API by `key` + `unit`.
const STATS = [
  { id: 'children', title: 'Total Children',  key: 'totalChildren',  unit: 'Child',   cardBg: '#FFFFE8', iconBg: '#898900', Icon: StatChildren },
  { id: 'teachers', title: 'Total teachers',  key: 'totalTeachers',  unit: 'Teacher', cardBg: '#EAF2E1', iconBg: '#4D8F00', Icon: StatTeacher },
  { id: 'checked',  title: 'Checked In',      key: 'checkedInToday', unit: 'Child',   cardBg: '#FFF3DC', iconBg: '#E2725B', Icon: StatCheck },
  { id: 'incident', title: 'Incident Reports', key: 'incidentsToday', unit: 'Report',  cardBg: '#F2F2F2', iconBg: '#5000F1', Icon: StatReport },
];

const ACTIVITY = [
  { title: 'Attendance Updated', desc: 'Today’s attendance has been recorded for all classes.' },
  { title: 'New Parent Invitation Accepted', desc: 'A parent has joined and completed their onboarding process.' },
  { title: 'Staff Action Completed', desc: 'Today’s class activities were updated in sunflower room by a teacher.' },
];

const CHART_HEIGHT = 190;

// Round a max value up to a "nice" chart ceiling (multiple of 20, min 20) so the
// y-axis quarters stay whole numbers (20/15/10/5/0, 40/30/20/10/0, …).
function niceMax(values) {
  const peak = Math.max(0, ...values);
  return Math.max(20, Math.ceil(peak / 20) * 20);
}

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
  const max = niceMax(data.map((d) => d.value));
  const yLabels = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return (
    <View>
      <View style={styles.chartRow}>
        <View style={styles.yAxis}>
          {yLabels.map((v) => (
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
                <View style={[styles.bar, { height: (d.value / max) * CHART_HEIGHT }]}>
                  {d.value > 0 && <Text style={styles.barValue}>{d.value}</Text>}
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

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function monthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { nurseryName, logoUrl, refreshNursery } = useData();
  const { unreadCount, refreshUnreadCount } = useNotifications();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ticket for the newest request — an older response that lands late must not
  // overwrite a newer one (or a request the screen already navigated away from).
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++requestId.current;
    setLoading(true);
    try {
      const res = await getDashboard();
      if (ticket !== requestId.current) return;
      setData(res);
      setError(null);
    } catch (e) {
      // A failed request must never read as a nursery with 0 children — say so
      // and give the admin a way to retry.
      if (ticket !== requestId.current) return;
      setError(e?.message || 'Could not load the dashboard.');
    } finally {
      if (ticket === requestId.current) setLoading(false);
    }
  }, []);

  // Everything here is time-sensitive — today's check-ins and incidents, this
  // week's attendance, the unread badge, the nursery logo/name — so refresh on
  // every focus, not once on mount. /profile and /notifications are pushed on
  // top of this screen, so it stays mounted while they're open.
  useFocusEffect(
    useCallback(() => {
      load();
      refreshUnreadCount();
      refreshNursery().catch(() => {});
    }, [load, refreshUnreadCount, refreshNursery])
  );

  // Only the very first load blanks the screen; focus refreshes swap the
  // numbers in place so returning from another screen doesn't flash a spinner.
  const firstLoad = loading && !data;
  // An error with nothing cached to fall back on — the only case where the
  // screen has nothing truthful to show.
  const failed = !!error && !data;

  // Chart data from the API; fall back to zeroed Sat..Thu while loading.
  const attendance = (data?.weeklyAttendance ?? []).map((d) => ({
    label: d.day,
    value: d.present,
  }));
  const chartData = attendance.length
    ? attendance
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((label) => ({ label, value: 0 }));

  // A dash while the first request is in flight — "0 Child" would be a claim
  // about the nursery that we can't make yet.
  const statValue = (key, unit) => (firstLoad ? `— ${unit}` : `${data?.[key] ?? 0} ${unit}`);

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
            <AuthImage path={logoUrl} fallback={avatar} style={styles.avatar} />
            <View style={styles.profileText}>
              <Text style={styles.name}>{user?.fullName || 'Admin'}</Text>
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
                {/* Past 99 the exact number stops being useful and the pill
                    would outgrow the icon. */}
                <Text style={styles.badgeText} numberOfLines={1}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {failed ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} hitSlop={8} disabled={loading}>
              <Text style={styles.retryText}>{loading ? 'Loading…' : 'Try Again'}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Overview */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <DateChip text={todayLabel()} />
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statRow}>
                  <StatCard {...STATS[0]} value={statValue(STATS[0].key, STATS[0].unit)} />
                  <StatCard {...STATS[1]} value={statValue(STATS[1].key, STATS[1].unit)} />
                </View>
                <View style={styles.statRow}>
                  <StatCard {...STATS[2]} value={statValue(STATS[2].key, STATS[2].unit)} />
                  <StatCard {...STATS[3]} value={statValue(STATS[3].key, STATS[3].unit)} />
                </View>
              </View>
            </View>

            {/* Daily Attendance */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Daily Attendance</Text>
                <DateChip text={monthLabel()} />
              </View>
              {firstLoad ? (
                <View style={styles.chartLoading}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : (
                <BarChart data={chartData} />
              )}
            </View>
          </>
        )}

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

  // Load failure (replaces Overview + Daily Attendance when nothing loaded)
  errorBox: {
    backgroundColor: Colors.tapsBg,
    borderRadius: Radii.button,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
  },
  retryText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 14,
    color: Colors.primary,
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
  chartLoading: { height: CHART_HEIGHT + 24, alignItems: 'center', justifyContent: 'center' },
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
