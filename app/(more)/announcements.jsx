import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Filter from '../../assets/icons/filter.svg';
import AnnounceDoc from '../../assets/icons/announce-doc.svg';
import EyeSeen from '../../assets/icons/eye-seen.svg';
import AttendanceFilterModal from '../../components/AttendanceFilterModal';
import { useAnnouncements } from '../../context/AnnouncementsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function Announcements() {
  const router = useRouter();
  const { announcements: ANNOUNCEMENTS } = useAnnouncements();
  const [showFilter, setShowFilter] = useState(false);
  const [roomFilter, setRoomFilter] = useState([]); // applied room names (empty = all)
  const [dateFilter, setDateFilter] = useState(null); // "DD MMM YYYY" | null

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  // Apply the filter: keep announcements matching the chosen rooms and/or date.
  const applyFilter = ({ rooms, date }) => {
    setRoomFilter(rooms);
    setDateFilter(date);
    setShowFilter(false);
  };

  const roomNames = [...new Set(ANNOUNCEMENTS.map((a) => a.room))];
  const activeCount = roomFilter.length + (dateFilter ? 1 : 0);

  const list = ANNOUNCEMENTS.filter(
    (a) =>
      (roomFilter.length === 0 || roomFilter.includes(a.room)) &&
      (!dateFilter || a.dateKey === dateFilter)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Announcements</Text>
        </View>
        <Pressable style={styles.filterBtn} hitSlop={6} onPress={() => setShowFilter(true)}>
          <Filter width={24} height={24} />
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.map((a) => (
          <Pressable
            key={a.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/announcement-details', params: { id: a.id } })}
          >
            <View style={styles.iconBox}>
              <AnnounceDoc width={24} height={24} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {a.title}
                </Text>
                <View style={styles.viewsBadge}>
                  <EyeSeen width={16} height={16} />
                  <Text style={styles.viewsText}>{a.views}</Text>
                </View>
              </View>
              <Text style={styles.cardText} numberOfLines={3}>{a.body}</Text>
              <Text style={styles.cardDate}>{a.date}</Text>
            </View>
          </Pressable>
        ))}

        {list.length === 0 && <Text style={styles.empty}>No announcements found.</Text>}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={() => router.push('/add-announcement')}
        >
          <Text style={styles.ctaText}>Add New Announcement</Text>
        </Pressable>
      </View>

      <AttendanceFilterModal
        visible={showFilter}
        rooms={roomNames}
        initial={{ rooms: roomFilter, date: dateFilter }}
        onClose={() => setShowFilter(false)}
        onApply={applyFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 9, color: Colors.white },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.lg, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm + 4,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    backgroundColor: Colors.secBg,
  },
  pressed: { opacity: 0.85 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: Spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  cardTitle: { flex: 1, fontFamily: Fonts.bold, fontWeight: '600', fontSize: 14, color: Colors.textBlack },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#EBFFDF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.button,
  },
  viewsText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: '#247400' },
  cardText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, lineHeight: 18 },
  cardDate: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.textBlack },
  empty: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, marginTop: Spacing.lg },

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
