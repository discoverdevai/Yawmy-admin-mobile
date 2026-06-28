import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Setup from '../../assets/icons/more-setup.svg';
import Attendance from '../../assets/icons/more-attendance.svg';
import Incident from '../../assets/icons/more-incident.svg';
import Announcements from '../../assets/icons/more-announcements.svg';
import Events from '../../assets/icons/calendar.svg';
import Export from '../../assets/icons/more-export.svg';
import ChevronRight from '../../assets/icons/chevron-right.svg';
import BottomTabBar from '../../components/BottomTabBar';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const ITEMS = [
  { key: 'setup', label: 'Nursey Setup', Icon: Setup, route: '/nursery-setup' },
  { key: 'attendance', label: 'Attendance', Icon: Attendance, route: '/attendance' },
  { key: 'incident', label: 'Incident log', Icon: Incident, route: '/incident-log' },
  { key: 'announcements', label: 'Announcements', Icon: Announcements, route: '/announcements' },
  { key: 'events', label: 'Events', Icon: Events, route: '/events' },
  { key: 'export', label: 'Data Export', Icon: Export, route: '/data-export' },
];

export default function More() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <Text style={styles.title}>More</Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ITEMS.map(({ key, label, Icon, route }) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => route && router.push(route)}
          >
            <View style={styles.rowLeft}>
              <Icon width={24} height={24} />
              <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <ChevronRight width={24} height={24} />
          </Pressable>
        ))}
      </ScrollView>

      <BottomTabBar active="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 110, gap: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: Radii.button,
    backgroundColor: Colors.primaryBgLight,
  },
  pressed: { opacity: 0.85 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
});
