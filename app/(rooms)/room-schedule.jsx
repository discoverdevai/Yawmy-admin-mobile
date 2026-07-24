import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
import ErrorModal from '../../components/ErrorModal';
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  to12h,
  to24h,
} from '../../services/sessionService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const noSchedule = require('../../assets/images/no-schedule.png');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_W = 48; // approx chip width + gap, for auto-scroll
const pad = (n) => String(n).padStart(2, '0');
const dateStrOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

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
              {to12h(session.startTime)} - {to12h(session.endTime)}
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
      <View style={styles.teacherRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(session.teacherName)}</Text>
        </View>
        <Text style={styles.teacherName}>{session.teacherName}</Text>
      </View>
    </View>
  );
}

export default function RoomSchedule() {
  const router = useRouter();
  const { roomId, archived } = useLocalSearchParams();
  const isArchived = archived === '1'; // archived rooms can't add sessions

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editSession, setEditSession] = useState(null); // raw session being edited
  const [submitting, setSubmitting] = useState(false);
  const [successText, setSuccessText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const stripRef = useRef(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dateStr = dateStrOf(year, month, selectedDay);

  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await getSessions(roomId, dateStr);
      setSessions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the schedule.');
    } finally {
      setLoading(false);
    }
  }, [roomId, dateStr]);

  // Refetch whenever the selected day changes.
  useEffect(() => {
    load();
  }, [load]);

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

  // Values from the modal: { name, teacherId, from, to } (from/to are "hh:mm AM/PM").
  const handleSubmitSession = async (values) => {
    if (submitting) return;
    const startTime = to24h(values.from);
    const endTime = to24h(values.to);
    const body = {
      name: values.name,
      teacherId: values.teacherId,
      date: dateStr,
      startTime,
      endTime,
    };
    setSubmitting(true);
    try {
      if (editSession) {
        await updateSession(roomId, editSession.id, body);
        setSuccessText('Session updated successfully!');
      } else {
        await createSession(roomId, body);
        setSuccessText('Session added successfully!');
      }
      closeModal();
      await load();
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not save the session.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target || deleting) return;
    setDeleting(true);
    try {
      await deleteSession(roomId, target.id);
      setDeleteTarget(null);
      await load();
      setSuccessText('Session deleted successfully!');
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not delete the session.');
    } finally {
      setDeleting(false);
    }
  };

  // Map the raw session to the shape the modal expects (display times).
  const editValues = editSession
    ? {
        name: editSession.name,
        teacherId: editSession.teacherId,
        from: to12h(editSession.startTime),
        to: to12h(editSession.endTime),
      }
    : null;

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

      {/* Sessions / loading / empty */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : sessions.length === 0 ? (
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
            {sessions.length} Session{sessions.length > 1 ? 's' : ''} for this day.
          </Text>
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onRequestEdit={() => setEditSession(s)}
              onRequestDelete={() => setDeleteTarget(s)}
            />
          ))}
        </ScrollView>
      )}

      {/* Footer CTA — disabled for archived rooms */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            isArchived && styles.ctaDisabled,
            pressed && !isArchived && styles.pressed,
          ]}
          disabled={isArchived}
          onPress={() => setShowAdd(true)}
        >
          <Text style={styles.ctaText}>Add Sessions</Text>
        </Pressable>
      </View>

      <AddSessionModal
        visible={showAdd || !!editSession}
        session={editValues}
        submitting={submitting}
        onClose={closeModal}
        onAdd={handleSubmitSession}
      />

      <RoomArchivedModal
        visible={showSuccess}
        title={successText || 'Session added successfully!'}
        onClose={() => setShowSuccess(false)}
      />

      <DeleteSessionModal
        visible={deleteTarget != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
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
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
