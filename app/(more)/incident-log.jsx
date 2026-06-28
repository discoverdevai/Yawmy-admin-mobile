import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Search from '../../assets/icons/search.svg';
import Filter from '../../assets/icons/filter.svg';
import EyeSeen from '../../assets/icons/eye-seen.svg';
import AttendanceFilterModal from '../../components/AttendanceFilterModal';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// Dummy incident records (from Figma 598-116437). One per child incident.
const INCIDENTS = [
  {
    id: '1',
    name: 'Maren Botosh',
    room: 'Sunshine Room',
    reason: 'Fall incident.',
    date: '01 Apr 2024',
    time: 'Mon, Apr 1 – 12:00 PM',
    description:
      'Lorem ipsum dolor sit amet consectetur. Fusce morbi amet enim nunc faucibus. Magna faucibus penatibus molestie ultrices ut.',
    action: 'Applied ice pack',
    area: 'Left knee',
    ackSeen: true,
  },
  {
    id: '2',
    name: 'Carla Lubin',
    room: 'Rainbow Room',
    reason: 'Minor scratch.',
    date: '02 Apr 2024',
    time: 'Tue, Apr 2 – 10:30 AM',
    description:
      'Lorem ipsum dolor sit amet consectetur. Fusce morbi amet enim nunc faucibus. Magna faucibus penatibus molestie ultrices ut.',
    action: 'Cleaned and bandaged',
    area: 'Right hand',
    ackSeen: false,
  },
  {
    id: '3',
    name: 'Randy Baptista',
    room: 'Blue Room',
    reason: 'Allergic reaction.',
    date: '03 Apr 2024',
    time: 'Wed, Apr 3 – 09:15 AM',
    description:
      'Lorem ipsum dolor sit amet consectetur. Fusce morbi amet enim nunc faucibus. Magna faucibus penatibus molestie ultrices ut.',
    action: 'Administered antihistamine',
    area: 'Face',
    ackSeen: true,
  },
  {
    id: '4',
    name: 'Hanna Carder',
    room: 'Sunshine Room',
    reason: 'Bite mark.',
    date: '03 Apr 2024',
    time: 'Wed, Apr 3 – 02:45 PM',
    description:
      'Lorem ipsum dolor sit amet consectetur. Fusce morbi amet enim nunc faucibus. Magna faucibus penatibus molestie ultrices ut.',
    action: 'Cleaned and monitored',
    area: 'Left arm',
    ackSeen: true,
  },
  {
    id: '5',
    name: 'Terry Philips',
    room: 'Sunshine Room',
    reason: 'Fall incident.',
    date: '04 Apr 2024',
    time: 'Thu, Apr 4 – 11:00 AM',
    description:
      'Lorem ipsum dolor sit amet consectetur. Fusce morbi amet enim nunc faucibus. Magna faucibus penatibus molestie ultrices ut.',
    action: 'Applied ice pack',
    area: 'Forehead',
    ackSeen: false,
  },
];

export default function IncidentLog() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  // Opening an incident marks its parent acknowledgement as seen.
  const [seenIds, setSeenIds] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [roomFilter, setRoomFilter] = useState([]); // applied room names (empty = all)
  const [dateFilter, setDateFilter] = useState(null); // "DD MMM YYYY" | null

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  const toggle = (id) => {
    setOpenId((cur) => (cur === id ? null : id));
    setSeenIds((list) => (list.includes(id) ? list : [...list, id]));
  };

  // Apply the filter: keep incidents matching the chosen rooms and/or date.
  const applyFilter = ({ rooms, date }) => {
    setRoomFilter(rooms);
    setDateFilter(date);
    setShowFilter(false);
  };

  const roomNames = [...new Set(INCIDENTS.map((i) => i.room))];
  const activeCount = roomFilter.length + (dateFilter ? 1 : 0);

  const q = query.trim().toLowerCase();
  const list = INCIDENTS.filter(
    (i) =>
      (!q || i.name.toLowerCase().includes(q)) &&
      (roomFilter.length === 0 || roomFilter.includes(i.room)) &&
      (!dateFilter || i.date === dateFilter)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Incident log</Text>
      </View>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Search width={24} height={24} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by child name.."
            placeholderTextColor={Colors.gray}
          />
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

      {/* Incident list */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.map((item) => {
          const open = openId === item.id;
          return (
            <View key={item.id} style={styles.group}>
              <Pressable
                style={[styles.card, open && styles.cardOpen]}
                onPress={() => toggle(item.id)}
              >
                <View style={styles.cardText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={[styles.reason, open && styles.reasonOpen]}>
                    {item.room} | {item.reason}
                  </Text>
                </View>
                <ChevronDown width={24} height={24} style={open ? styles.chevronUp : undefined} />
              </Pressable>

              {open && (
                <View style={styles.detail}>
                  <Text style={styles.time}>{item.time}</Text>

                  <View style={styles.row}>
                    <Text style={styles.bullet}>{'•'}</Text>
                    <Text style={styles.rowText}>
                      <Text style={styles.rowLabel}>Description: </Text>
                      {item.description}
                    </Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.row}>
                    <Text style={styles.bullet}>{'•'}</Text>
                    <Text style={styles.rowText}>
                      <Text style={styles.rowLabel}>Action Taken: </Text>
                      {item.action}
                    </Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.row}>
                    <Text style={styles.bullet}>{'•'}</Text>
                    <Text style={styles.rowText}>
                      <Text style={styles.rowLabel}>Affected Area: </Text>
                      {item.area}
                    </Text>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.ackRow}>
                    <Text style={styles.rowLabel}>Parent Ack:</Text>
                    {item.ackSeen || seenIds.includes(item.id) ? (
                      <View style={styles.seenBadge}>
                        <EyeSeen width={16} height={16} />
                        <Text style={styles.seenText}>Seen</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {list.length === 0 && (
          <Text style={styles.empty}>No incidents found.</Text>
        )}
      </ScrollView>

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
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  searchInput: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
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

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.md },
  group: { gap: Spacing.sm },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    padding: Spacing.sm + 4,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primaryBg,
    backgroundColor: Colors.primaryBgLight,
  },
  cardOpen: { borderColor: Colors.primary },
  cardText: { flex: 1, gap: Spacing.xs },
  name: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  reason: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.redText },
  reasonOpen: { color: Colors.accentText },
  chevronUp: { transform: [{ rotate: '180deg' }] },

  detail: {
    padding: Spacing.sm + 4,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBgLight,
    gap: Spacing.sm,
  },
  time: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  row: { flexDirection: 'row', gap: Spacing.sm },
  bullet: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textBlack, lineHeight: 21 },
  rowText: { flex: 1, fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack, lineHeight: 21 },
  rowLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  divider: { height: 1, backgroundColor: Colors.stroke },

  ackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#DAFCCB',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  seenText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: '#247400' },
  pendingBadge: {
    backgroundColor: Colors.accentSecBg,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  pendingText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.accentText },

  empty: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, marginTop: Spacing.lg },
});
