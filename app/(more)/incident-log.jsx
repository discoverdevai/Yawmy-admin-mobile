import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Search from '../../assets/icons/search.svg';
import Filter from '../../assets/icons/filter.svg';
import EyeSeen from '../../assets/icons/eye-seen.svg';
import RoomDateFilterModal from '../../components/RoomDateFilterModal';
import ErrorModal from '../../components/ErrorModal';
import { getIncidents } from '../../services/incidentService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "15 Aug 2020" from an ISO instant — matches the filter's date format for comparison.
const dateKey = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// "Mon, Apr 1 – 12:00 PM" from an ISO instant (device-local time).
const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const period = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} – ${h}:${min} ${period}`;
};

export default function IncidentLog() {
  const router = useRouter();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [roomFilter, setRoomFilter] = useState([]); // applied room names (empty = all)
  const [dateFilter, setDateFilter] = useState(null); // "DD MMM YYYY" | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getIncidents();
      setIncidents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load incidents.');
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

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  const roomNames = [...new Set(incidents.map((i) => i.roomName || 'Unassigned'))];
  const activeCount = roomFilter.length + (dateFilter ? 1 : 0);

  const q = query.trim().toLowerCase();
  const list = incidents.filter((i) => {
    const room = i.roomName || 'Unassigned';
    return (
      (!q || (i.childName || '').toLowerCase().includes(q)) &&
      (roomFilter.length === 0 || roomFilter.includes(room)) &&
      (!dateFilter || dateKey(i.incidentAt) === dateFilter)
    );
  });

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
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {list.map((item) => {
            const open = openId === item.id;
            const room = item.roomName || 'Unassigned';
            const seen = (item.acknowledgedCount || 0) > 0;
            return (
              <View key={item.id} style={styles.group}>
                <Pressable
                  style={[styles.card, open && styles.cardOpen]}
                  onPress={() => toggle(item.id)}
                >
                  <View style={styles.cardText}>
                    <Text style={styles.name}>{item.childName}</Text>
                    <Text style={[styles.reason, open && styles.reasonOpen]}>
                      {room} | {item.incidentType || '—'}
                    </Text>
                  </View>
                  <ChevronDown width={24} height={24} style={open ? styles.chevronUp : undefined} />
                </Pressable>

                {open && (
                  <View style={styles.detail}>
                    <Text style={styles.time}>{fmtDateTime(item.incidentAt)}</Text>

                    <View style={styles.row}>
                      <Text style={styles.bullet}>{'•'}</Text>
                      <Text style={styles.rowText}>
                        <Text style={styles.rowLabel}>Description: </Text>
                        {item.description || '—'}
                      </Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.row}>
                      <Text style={styles.bullet}>{'•'}</Text>
                      <Text style={styles.rowText}>
                        <Text style={styles.rowLabel}>Action Taken: </Text>
                        {item.actionTaken || '—'}
                      </Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.row}>
                      <Text style={styles.bullet}>{'•'}</Text>
                      <Text style={styles.rowText}>
                        <Text style={styles.rowLabel}>Affected Area: </Text>
                        {item.injuryArea || '—'}
                      </Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.ackRow}>
                      <Text style={styles.rowLabel}>Parent Ack:</Text>
                      {seen ? (
                        <View style={styles.seenBadge}>
                          <EyeSeen width={16} height={16} />
                          <Text style={styles.seenText}>Seen</Text>
                        </View>
                      ) : (
                        <View style={styles.notSeenBadge}>
                          <Text style={styles.notSeenText}>Not seen</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {list.length === 0 && <Text style={styles.empty}>No incidents found.</Text>}
        </ScrollView>
      )}

      <RoomDateFilterModal
        visible={showFilter}
        rooms={roomNames}
        initial={{ rooms: roomFilter, date: dateFilter }}
        onClose={() => setShowFilter(false)}
        onApply={({ rooms, date }) => {
          setRoomFilter(rooms);
          setDateFilter(date);
          setShowFilter(false);
        }}
      />

      <ErrorModal
        visible={!!error && !loading}
        title="Something went wrong"
        message={error}
        buttonText="OK"
        onClose={() => setError(null)}
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
  notSeenBadge: {
    backgroundColor: Colors.lightRedBg,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  notSeenText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.redText },

  empty: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, marginTop: Spacing.lg },
});
