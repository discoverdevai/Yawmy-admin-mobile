import { useEffect, useRef, useState, useCallback } from 'react';
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
import Search from '../../assets/icons/search.svg';
import Filter from '../../assets/icons/filter.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import StatCheck from '../../assets/icons/stat-check.svg';
import AbsentX from '../../assets/icons/absent-x.svg';
import AuthImage from '../../components/AuthImage';
import ErrorModal from '../../components/ErrorModal';
import AttendanceFilterModal from '../../components/AttendanceFilterModal';
import { getRoster } from '../../services/attendanceService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatarFallback = require('../../assets/images/child-avatar.png');
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_W = 48;
const pad = (n) => String(n).padStart(2, '0');
const dateStrOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const fmtTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let h = d.getHours();
  const period = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(d.getMinutes())} ${period}`;
};

function ChildRow({ c }) {
  const present = c.status !== 'NOT_ARRIVED';
  const checkIn = fmtTime(c.lastCheckInAt);
  const checkOut = fmtTime(c.lastCheckOutAt);
  return (
    <View style={[styles.childCard, present ? styles.presentCard : styles.absentCard]}>
      <AuthImage path={c.photoUrl} fallback={avatarFallback} style={styles.avatar} contentFit="cover" />
      <View style={styles.childText}>
        <Text style={styles.childName} numberOfLines={1}>{c.childName}</Text>
        {present ? (
          <Text style={styles.times}>
            Check in: {checkIn || '—'}   Check Out: {checkOut || '—'}
          </Text>
        ) : (
          <Text style={styles.absentText}>Absent</Text>
        )}
      </View>
      {present ? <StatCheck width={24} height={24} /> : <AbsentX width={24} height={24} />}
    </View>
  );
}

export default function Attendance() {
  const router = useRouter();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({}); // { [roomName]: true } when collapsed
  const [showFilter, setShowFilter] = useState(false);
  const [roomFilter, setRoomFilter] = useState([]); // selected room names; [] = all
  const stripRef = useRef(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dateStr = dateStrOf(year, month, selectedDay);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoster(dateStr);
      setRoster(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load attendance.');
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const x = Math.max(0, (selectedDay - 1) * DAY_W - 120);
    stripRef.current?.scrollTo({ x, animated: false });
  }, [year, month]);

  const shiftMonth = (delta) => {
    const base = new Date(year, month + delta, 1);
    setYear(base.getFullYear());
    setMonth(base.getMonth());
    setSelectedDay(1);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  // Distinct room names in this day's roster — feeds the filter modal.
  const roomOptions = [];
  for (const c of roster) {
    const room = c.roomName || 'Unassigned';
    if (!roomOptions.includes(room)) roomOptions.push(room);
  }

  // Group the roster by room, apply the room filter + search, drop empty rooms.
  const q = query.trim().toLowerCase();
  const grouped = [];
  const index = {};
  for (const c of roster) {
    const room = c.roomName || 'Unassigned';
    if (roomFilter.length && !roomFilter.includes(room)) continue;
    if (q && !(c.childName || '').toLowerCase().includes(q)) continue;
    if (index[room] == null) {
      index[room] = grouped.length;
      grouped.push({ room, children: [] });
    }
    grouped[index[room]].children.push(c);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance</Text>
      </View>

      {/* Month + day selector */}
      <View style={styles.calendar}>
        <View style={styles.monthRow}>
          <Pressable style={styles.chevron} hitSlop={6} onPress={() => shiftMonth(-1)}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.monthText}>{MONTHS[month]} {year}</Text>
          <Pressable style={styles.chevron} hitSlop={6} onPress={() => shiftMonth(1)}>
            <ArrowLeft width={24} height={24} style={styles.flip} />
          </Pressable>
        </View>

        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekRow}
        >
          {days.map((d) => {
            const dow = new Date(year, month, d).getDay();
            const on = d === selectedDay;
            return (
              <Pressable key={d} onPress={() => setSelectedDay(d)} style={[styles.dayCol, on && styles.dayColOn]}>
                {on && <View style={styles.dot} />}
                <Text style={[styles.dayLabel, on && styles.dayLabelOn]}>{WEEKDAYS[dow]}</Text>
                <Text style={[styles.dayNum, on && styles.dayNumOn]}>{d}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Search width={24} height={24} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={Colors.gray}
          />
        </View>
        <Pressable
          style={[styles.filterBtn, roomFilter.length > 0 && styles.filterBtnOn]}
          onPress={() => setShowFilter(true)}
          hitSlop={6}
        >
          <Filter width={24} height={24} />
          {roomFilter.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{roomFilter.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Rooms + children */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {grouped.length === 0 && (
            <Text style={styles.empty}>No children found for this day.</Text>
          )}
          {grouped.map(({ room, children }) => {
            const open = !collapsed[room];
            return (
              <View key={room} style={styles.roomCard}>
                <Pressable
                  style={styles.roomHead}
                  onPress={() => setCollapsed((s) => ({ ...s, [room]: open }))}
                >
                  <Text style={styles.roomName}>{room}</Text>
                  <ChevronDown width={24} height={24} style={open ? undefined : styles.chevronUp} />
                </Pressable>
                {open && children.map((c) => <ChildRow key={c.childId} c={c} />)}
              </View>
            );
          })}
        </ScrollView>
      )}

      <AttendanceFilterModal
        visible={showFilter}
        rooms={roomOptions}
        initial={{ rooms: roomFilter }}
        onClose={() => setShowFilter(false)}
        onApply={({ rooms }) => {
          setRoomFilter(rooms);
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

  calendar: { gap: Spacing.sm + 4, paddingTop: Spacing.sm },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm + 4 },
  chevron: {
    width: 40,
    height: 40,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flip: { transform: [{ rotate: '180deg' }] },
  monthText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  weekRow: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  dayCol: { alignItems: 'center', gap: 2, paddingVertical: Spacing.sm, width: 40 },
  dayColOn: {
    backgroundColor: Colors.primaryBgLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: Radii.lg,
    width: 48,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  dayLabel: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  dayLabelOn: { color: Colors.primaryText },
  dayNum: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.gray },
  dayNumOn: { color: Colors.primaryText },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  filterBtnOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBgLight },
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
  filterBadgeText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 10, color: Colors.background },

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.md },
  empty: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  roomCard: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.sm + 4,
  },
  roomHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomName: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.textBlack },
  chevronUp: { transform: [{ rotate: '180deg' }] },

  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  presentCard: { backgroundColor: Colors.lightGreen, borderColor: Colors.primary },
  absentCard: { backgroundColor: Colors.lightRedBg, borderColor: Colors.redText },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  childText: { flex: 1, gap: Spacing.xs },
  childName: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  times: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  absentText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 12, color: Colors.redText },
});
