import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Clock from '../../assets/icons/clock.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Trash from '../../assets/icons/trash.svg';
import AddSessionModal from '../../components/AddSessionModal';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import DeleteSessionModal from '../../components/DeleteSessionModal';
import { useRooms } from '../../context/RoomsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const noSchedule = require('../../assets/images/no-schedule.png');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_W = 48; // approx chip width + gap, for auto-scroll
const dateKey = (y, m, d) => `${y}-${m}-${d}`;

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

function SessionCard({ session, onRequestEdit, onRequestDelete }) {
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTop}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <View style={styles.timeRow}>
            <Clock width={16} height={16} />
            <Text style={styles.timeText}>
              {session.from} - {session.to}
            </Text>
          </View>
        </View>
        <View style={styles.sessionActions}>
          <Pressable hitSlop={6} onPress={onRequestEdit}>
            <EditIcon width={24} height={24} />
          </Pressable>
          <Pressable hitSlop={6} onPress={onRequestDelete}>
            <Trash width={24} height={24} />
          </Pressable>
        </View>
      </View>
      <View style={styles.teacherList}>
        {(session.teachers || []).map((t) => (
          <View key={t} style={styles.teacherRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(t)}</Text>
            </View>
            <Text style={styles.teacherName}>Ms. {t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function RoomSchedule() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const { sessions, addSession, removeSession, updateSession } = useRooms();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(2); // March
  const [selectedDay, setSelectedDay] = useState(21);
  const [showAdd, setShowAdd] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [successText, setSuccessText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const stripRef = useRef(null);

  const rid = Number(roomId);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const key = dateKey(year, month, selectedDay);
  const daySessions = (sessions[rid] || []).filter((s) => s.date === key);

  // Keep the selected day in view when the month changes.
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
    else router.replace('/rooms');
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditSession(null);
  };

  const handleSubmitSession = (values) => {
    if (editSession) {
      updateSession(rid, editSession.id, values);
      setSuccessText('Session edited successfully!');
    } else {
      addSession(rid, { ...values, date: key });
      setSuccessText('Session added successfully!');
    }
    closeModal();
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
        <Text style={styles.headerTitle}>Room Schedule</Text>
      </View>

      {/* Month + day selector */}
      <View style={styles.calendar}>
        <View style={styles.monthRow}>
          <Pressable style={styles.chevron} hitSlop={6} onPress={() => shiftMonth(-1)}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.monthText}>
            {MONTHS[month]} {year}
          </Text>
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
            const isSelected = d === selectedDay;
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(d)}
                style={[styles.dayCol, isSelected && styles.dayColOn]}
              >
                {isSelected && <View style={styles.dot} />}
                <Text style={[styles.dayLabel, isSelected && styles.dayLabelOn]}>
                  {WEEKDAYS[dow]}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayNumOn]}>{d}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Sessions or empty state */}
      {daySessions.length === 0 ? (
        <View style={styles.empty}>
          <Image source={noSchedule} style={styles.illustration} contentFit="contain" />
          <View style={styles.emptyText}>
            <Text style={styles.emptyTitle}>No Schedule Yet!</Text>
            <Text style={styles.emptyDesc}>
              This room doesn’t have any sessions scheduled yet, Start building the daily
              activities for this room.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.count}>
            {daySessions.length} Session{daySessions.length > 1 ? 's' : ''} for today.
          </Text>
          {daySessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onRequestEdit={() => setEditSession(s)}
              onRequestDelete={() => setDeleteId(s.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Footer CTA */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={styles.ctaText}>Add Sessions</Text>
        </Pressable>
      </View>

      <AddSessionModal
        visible={showAdd || !!editSession}
        session={editSession}
        onClose={closeModal}
        onAdd={handleSubmitSession}
      />

      <RoomArchivedModal
        visible={showSuccess}
        title={successText || 'Session added successfully!'}
        onClose={() => setShowSuccess(false)}
      />

      <DeleteSessionModal
        visible={deleteId != null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          removeSession(rid, deleteId);
          setDeleteId(null);
        }}
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
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },

  // Calendar
  calendar: { gap: Spacing.sm + 4, paddingTop: Spacing.sm },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm + 4,
  },
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
  monthText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
  weekRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
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

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  illustration: { width: 343, height: 229, maxWidth: '100%' },
  emptyText: { alignItems: 'center', gap: Spacing.sm + 4 },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },

  // Sessions list
  list: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  count: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  sessionCard: {
    backgroundColor: Colors.secBg,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryBg,
    paddingBottom: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  sessionInfo: { flex: 1, gap: Spacing.sm },
  sessionName: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textBlack,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  timeText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  sessionActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  teacherList: { width: '100%', gap: Spacing.sm },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 10,
    color: Colors.primaryText,
  },
  teacherName: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  // Footer
  footer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
