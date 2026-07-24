import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Refresh from '../../assets/icons/refresh.svg';
import Done from '../../assets/icons/done.svg';
import RoomIcon from '../../assets/icons/tab-rooms.svg';
import AuthImage from '../../components/AuthImage';
import ReassignChildModal from '../../components/ReassignChildModal';
import ErrorModal from '../../components/ErrorModal';
import { getRoom, getRooms, archiveRoomWithReassignment } from '../../services/roomsService';
import { getChildren } from '../../services/childrenService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatarFallback = require('../../assets/images/child-avatar.png');
const shortId = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();

function Radio({ selected, disabled }) {
  return (
    <View style={[styles.radio, selected && styles.radioOn, disabled && styles.radioDisabled]}>
      {selected && <View style={styles.radioDot} />}
    </View>
  );
}

export default function ReassignChildren() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();

  const [source, setSource] = useState(null);
  const [rooms, setRooms] = useState([]); // other active rooms (destinations)
  const [sourceChildren, setSourceChildren] = useState([]); // children to move
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Staged choices — nothing is applied until "Reassign Children" is pressed.
  const [bulkTarget, setBulkTarget] = useState(null); // upper radio: one room or none
  const [individual, setIndividual] = useState({}); // { [childId]: roomId }
  const [picker, setPicker] = useState({ visible: false, childId: null });
  const [slotsError, setSlotsError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [src, allRooms, kids] = await Promise.all([
        getRoom(roomId),
        getRooms(false), // active rooms only
        getChildren({ roomId }),
      ]);
      setSource(src);
      setRooms((allRooms || []).filter((r) => r.id !== roomId));
      setSourceChildren(kids || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the room.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId) load();
  }, [roomId, load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  // Available slots reflect staged individual choices so counts stay honest.
  const stagedTo = (rid) => Object.values(individual).filter((id) => id === rid).length;
  const targetRooms = rooms.map((r) => ({
    ...r,
    slots: Math.max((r.capacity ?? 0) - (r.childCount ?? 0) - stagedTo(r.id), 0),
  }));

  const bulkSelected = bulkTarget != null;
  const remaining = sourceChildren.filter((c) => individual[c.id] == null);
  const canSubmit =
    !submitting &&
    (sourceChildren.length === 0 || remaining.length === 0 || bulkSelected);

  const toggleBulk = (id) => setBulkTarget((prev) => (prev === id ? null : id));

  const openPicker = (childId) => {
    if (bulkSelected) return; // lower part is read-only while a bulk room is chosen
    setPicker({ visible: true, childId });
  };
  const confirmPicker = (targetRoomId) => {
    setIndividual((prev) => ({ ...prev, [picker.childId]: targetRoomId }));
    setPicker({ visible: false, childId: null });
  };

  const commit = async () => {
    if (!canSubmit) return;
    const restIds = remaining.map((c) => c.id);

    // The bulk room must have enough free slots for everyone still unassigned.
    if (restIds.length && bulkTarget != null) {
      const target = targetRooms.find((r) => r.id === bulkTarget);
      const slots = target?.slots ?? 0;
      if (restIds.length > slots) {
        setSlotsError({ room: target?.name, slots, count: restIds.length });
        return;
      }
    }

    // Build the full child -> room map (staged individuals + the rest to bulk).
    const reassignments = Object.entries(individual).map(([childId, rid]) => ({
      childId,
      roomId: rid,
    }));
    if (restIds.length && bulkTarget != null) {
      restIds.forEach((childId) => reassignments.push({ childId, roomId: bulkTarget }));
    }

    setSubmitting(true);
    try {
      await archiveRoomWithReassignment(roomId, reassignments);
      router.replace({ pathname: '/rooms', params: { archived: '1' } });
    } catch (e) {
      setError(e.message || 'Could not reassign the children.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Reassign Children</Text>
        </View>
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Reassign Children</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Bulk: pick a destination room */}
        <Text style={styles.sectionLabel}>Reassign all children to:</Text>
        <View style={styles.group}>
          {targetRooms.length === 0 && (
            <Text style={styles.empty}>No other rooms available.</Text>
          )}
          {targetRooms.map((r) => {
            const disabled = r.slots <= 0;
            const selected = bulkTarget === r.id;
            return (
              <Pressable
                key={r.id}
                style={styles.roomCard}
                disabled={disabled}
                onPress={() => toggleBulk(r.id)}
              >
                <View style={styles.roomLeft}>
                  <View style={styles.roomAvatar}>
                    {r.imageUrl ? (
                      <AuthImage path={r.imageUrl} style={styles.roomAvatarImg} contentFit="cover" />
                    ) : (
                      <RoomIcon width={22} height={22} />
                    )}
                  </View>
                  <View style={styles.roomText}>
                    <Text style={[styles.roomName, disabled && styles.dim]}>{r.name}</Text>
                    <Text style={styles.roomSlots}>
                      {r.childCount} children, {r.slots} available slots
                    </Text>
                  </View>
                </View>
                <Radio selected={selected} disabled={disabled} />
              </Pressable>
            );
          })}
        </View>

        {/* Individual reassignment */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>Or reassign individually:</Text>
        <View style={styles.group}>
          {sourceChildren.length === 0 ? (
            <Text style={styles.empty}>This room has no children.</Text>
          ) : (
            sourceChildren.map((c) => {
              const done = individual[c.id] != null;
              return (
                <View key={c.id} style={styles.childCard}>
                  <AuthImage
                    path={c.photoUrl}
                    fallback={avatarFallback}
                    style={styles.childAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.childText}>
                    <Text style={styles.childName} numberOfLines={1}>{c.fullName}</Text>
                    <Text style={styles.childId}>ID: {shortId(c.id)}</Text>
                  </View>
                  {done ? (
                    <View style={styles.doneBadge}>
                      <Done width={16} height={16} />
                      <Text style={styles.doneText}>Done</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.assignBtn, bulkSelected && styles.assignLocked]}
                      disabled={bulkSelected}
                      onPress={() => openPicker(c.id)}
                    >
                      <Refresh width={16} height={16} />
                      <Text style={styles.assignText}>Assign</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            !canSubmit && styles.ctaDisabled,
            pressed && canSubmit && styles.pressed,
          ]}
          onPress={commit}
          disabled={!canSubmit}
        >
          <Text style={styles.ctaText}>{submitting ? 'Reassigning…' : 'Reassign Children'}</Text>
        </Pressable>
      </SafeAreaView>

      <ReassignChildModal
        visible={picker.visible}
        rooms={targetRooms}
        onClose={() => setPicker({ visible: false, childId: null })}
        onConfirm={confirmPicker}
      />

      <ErrorModal
        visible={!!slotsError}
        title="Not Enough Slots"
        message={
          slotsError
            ? `${slotsError.room} has only ${slotsError.slots} available slot${
                slotsError.slots === 1 ? '' : 's'
              }, but ${slotsError.count} children still need a room. Reassign some of them to other rooms individually.`
            : ''
        }
        buttonText="Got It"
        onClose={() => setSlotsError(null)}
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

  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  sectionLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  sectionGap: { marginTop: Spacing.lg },
  group: { gap: Spacing.sm + 4 },
  empty: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },

  // Destination room card
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  roomLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  roomAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.button,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roomAvatarImg: { width: 40, height: 40, borderRadius: Radii.button },
  roomText: { flex: 1, gap: Spacing.xs },
  roomName: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  roomSlots: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  dim: { color: Colors.gray },

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.primary },
  radioDisabled: { opacity: 0.4 },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },

  // Child card
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  childAvatar: { width: 40, height: 40, borderRadius: 20 },
  childText: { flex: 1, gap: Spacing.xs },
  childName: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  childId: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  assignLocked: { opacity: 0.4 },
  assignText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.white,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.accentSecBg,
  },
  doneText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.accent,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
  },
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
