import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeft from "../../assets/icons/arrow-left.svg";
import ChevronDown from "../../assets/icons/chevron-down.svg";
import Search from "../../assets/icons/search.svg";
import Filter from "../../assets/icons/filter.svg";
import Present from "../../assets/icons/status-active.svg";
import Absent from "../../assets/icons/absent-x.svg";
import AttendanceFilterModal from "../../components/AttendanceFilterModal";
import { useRooms } from "../../context/RoomsContext";
import { CHILDREN } from "../../constants/people";
import { Colors, Fonts, Spacing, Radii } from "../../constants/theme";

const childAvatar = require("../../assets/images/child-avatar.png");

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Dummy attendance: a child is "absent" on some days, otherwise present 8–12.
const isAbsent = (childId, day) => (childId * 3 + day) % 7 === 0;

export default function Attendance() {
  const router = useRouter();
  const { rooms, childInfo } = useRooms();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(today.getDate());
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [roomFilter, setRoomFilter] = useState([]); // applied room names (empty = all)
  // Each room expands/collapses independently via its own arrow.
  const [openRooms, setOpenRooms] = useState(() =>
    rooms[0] ? [rooms[0].id] : [],
  );
  const toggleRoom = (id) =>
    setOpenRooms((list) =>
      list.includes(id) ? list.filter((r) => r !== id) : [...list, id],
    );
  const stripRef = useRef(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setDay(1);
  };

  const weekdayOf = (d) => WEEKDAYS[new Date(year, month, d).getDay()];
  const childName = (id) =>
    childInfo[id]?.name || CHILDREN.find((c) => c.id === id)?.name || "Child";

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/more");
  };

  // Apply the filter: set the room filter and, if a date was chosen, jump to it.
  const applyFilter = ({ rooms: pickedRooms, date }) => {
    setRoomFilter(pickedRooms);
    const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(date || "");
    if (m) {
      const monthIdx = MONTHS.findIndex(
        (mo) => mo.slice(0, 3).toLowerCase() === m[2].toLowerCase(),
      );
      if (monthIdx >= 0) {
        setYear(Number(m[3]));
        setMonth(monthIdx);
        setDay(Number(m[1]));
      }
    }
    setShowFilter(false);
  };

  const q = query.trim().toLowerCase();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance</Text>
      </View>

      {/* Month nav */}
      <View style={styles.monthNav}>
        <Pressable
          style={styles.navBtn}
          onPress={() => shiftMonth(-1)}
          hitSlop={6}
        >
          <ChevronDown width={24} height={24} style={styles.chevronLeft} />
        </Pressable>
        <Text style={styles.monthLabel}>{`${MONTHS[month]} ${year}`}</Text>
        <Pressable
          style={styles.navBtn}
          onPress={() => shiftMonth(1)}
          hitSlop={6}
        >
          <ChevronDown width={24} height={24} style={styles.chevronRight} />
        </Pressable>
      </View>

      {/* Day strip */}
      <ScrollView
        ref={stripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayStripScroll}
        contentContainerStyle={styles.strip}
      >
        {dayList.map((d) => {
          const sel = d === day;
          return (
            <Pressable key={d} style={styles.dayCell} onPress={() => setDay(d)}>
              {sel ? (
                <View style={styles.daySelected}>
                  <View style={styles.dayDot} />
                  <Text style={styles.dayWeekSel}>{weekdayOf(d)}</Text>
                  <Text style={styles.dayNumSel}>{d}</Text>
                </View>
              ) : (
                <View style={styles.dayPlain}>
                  <Text style={styles.dayWeek}>{weekdayOf(d)}</Text>
                  <Text style={styles.dayNum}>{d}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

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
        <Pressable style={styles.filterBtn} onPress={() => setShowFilter(true)}>
          <Filter width={24} height={24} />
          {roomFilter.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{roomFilter.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Rooms accordion */}
      <ScrollView
        style={styles.roomsScroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {rooms
          .filter(
            (room) => roomFilter.length === 0 || roomFilter.includes(room.name),
          )
          .map((room) => {
            const roomMatches = room.name.toLowerCase().includes(q);
            const allKids = room.childIds.map((id) => ({
              id,
              name: childName(id),
              absent: isAbsent(id, day),
            }));
            // When the room name matches, keep all its children; otherwise filter by child name.
            const kids =
              !q || roomMatches
                ? allKids
                : allKids.filter((k) => k.name.toLowerCase().includes(q));

            // While searching, hide rooms with no match and auto-expand the matches.
            if (q && !roomMatches && kids.length === 0) return null;
            const open = q
              ? roomMatches || kids.length > 0
              : openRooms.includes(room.id);

            return (
              <View
                key={room.id}
                style={[
                  styles.roomCard,
                  open ? styles.roomCardOpen : styles.roomCardClosed,
                ]}
              >
                <Pressable
                  style={styles.roomHead}
                  onPress={() => toggleRoom(room.id)}
                >
                  <Text style={styles.roomName}>{room.name}</Text>
                  <ChevronDown
                    width={24}
                    height={24}
                    style={open ? styles.chevronUp : undefined}
                  />
                </Pressable>

                {open &&
                  kids.map((k) => (
                    <View
                      key={k.id}
                      style={[
                        styles.childCard,
                        k.absent ? styles.childAbsent : styles.childPresent,
                      ]}
                    >
                      <View style={styles.childLeft}>
                        <Image
                          source={childAvatar}
                          style={styles.avatar}
                          contentFit="cover"
                        />
                        <View style={styles.childText}>
                          <Text style={styles.childName} numberOfLines={1}>
                            {k.name}
                          </Text>
                          {k.absent ? (
                            <Text style={styles.absentText}>Absent</Text>
                          ) : (
                            <View style={styles.timesRow}>
                              <Text style={styles.timeText}>
                                Check in: 08:00 Am
                              </Text>
                              <Text style={styles.timeText}>
                                Check Out: 12:00 Pm
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {k.absent ? (
                        <Absent width={24} height={24} />
                      ) : (
                        <Present width={24} height={24} />
                      )}
                    </View>
                  ))}
              </View>
            );
          })}
      </ScrollView>

      <AttendanceFilterModal
        visible={showFilter}
        rooms={rooms.map((r) => r.name)}
        initial={{ rooms: roomFilter, date: null }}
        onClose={() => setShowFilter(false)}
        onApply={applyFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: "700",
    fontSize: 20,
    color: Colors.textBlack,
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronLeft: { transform: [{ rotate: "90deg" }] },
  chevronRight: { transform: [{ rotate: "-90deg" }] },
  monthLabel: {
    fontFamily: Fonts.medium,
    fontWeight: "500",
    fontSize: 14,
    color: Colors.textBlack,
  },

  dayStripScroll: { flexGrow: 0 },
  strip: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  roomsScroll: { flex: 1 },
  dayCell: { alignItems: "center" },
  dayPlain: {
    width: 40,
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.sm,
  },
  dayWeek: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  dayNum: {
    fontFamily: Fonts.bold,
    fontWeight: "700",
    fontSize: 16,
    color: Colors.gray,
  },
  daySelected: {
    width: 48,
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBgLight,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  dayWeekSel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.primaryText,
  },
  dayNumSel: {
    fontFamily: Fonts.bold,
    fontWeight: "700",
    fontSize: 16,
    color: Colors.primaryText,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colors.secStroke,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontFamily: Fonts.bold,
    fontWeight: "700",
    fontSize: 9,
    color: Colors.white,
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  roomCard: { borderRadius: 32, padding: Spacing.sm + 4, gap: Spacing.md },
  roomCardOpen: { borderWidth: 1, borderColor: Colors.primary },
  roomCardClosed: { backgroundColor: Colors.secBg, borderRadius: Radii.button },
  roomHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomName: {
    fontFamily: Fonts.bold,
    fontWeight: "700",
    fontSize: 18,
    color: Colors.textBlack,
  },
  chevronUp: { transform: [{ rotate: "180deg" }] },

  childCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
    borderRadius: Radii.button,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  childPresent: {
    backgroundColor: Colors.lightGreen,
    borderColor: Colors.primary,
  },
  childAbsent: {
    backgroundColor: Colors.lightRedBg,
    borderColor: Colors.redText,
  },
  childLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  childText: { flex: 1, gap: Spacing.sm },
  childName: {
    fontFamily: Fonts.bold,
    fontWeight: "600",
    fontSize: 16,
    color: Colors.textBlack,
  },
  timesRow: { flexDirection: "row", gap: Spacing.sm },
  timeText: {
    fontFamily: Fonts.bold,
    fontWeight: "600",
    fontSize: 10,
    color: Colors.gray,
  },
  absentText: {
    fontFamily: Fonts.bold,
    fontWeight: "600",
    fontSize: 10,
    color: Colors.redText,
  },
});
