import { useEffect, useState, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Search from '../../assets/icons/search.svg';
import PlusPrimary from '../../assets/icons/plus-primary.svg';
import Done from '../../assets/icons/done.svg';
import Refresh from '../../assets/icons/refresh.svg';
import AuthImage from '../../components/AuthImage';
import ErrorModal from '../../components/ErrorModal';
import AddChildModal from '../../components/AddChildModal';
import ChildNotFoundModal from '../../components/ChildNotFoundModal';
import { getRoom } from '../../services/roomsService';
import { getChildren, reassignChildRoom } from '../../services/childrenService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatarFallback = require('../../assets/images/child-avatar.png');

// Short, human-friendly ID from the child's UUID (backend has no separate code).
const shortId = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();

export default function AssignChildren() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();

  const [room, setRoom] = useState(null);
  const [children, setChildren] = useState([]); // unassigned children (the list)
  const [status, setStatus] = useState({}); // childId -> 'idle' | 'loading' | 'done'

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomFull, setRoomFull] = useState(false);
  // Add-by-name flow — UI only, NOT wired to the backend yet (pending client decision).
  const [showAdd, setShowAdd] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, all] = await Promise.all([
        getRoom(roomId),
        getChildren({ includeUnenrolled: false }),
      ]);
      setRoom(r);
      setChildren((all || []).filter((c) => !c.roomId)); // not in any room yet
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load children.');
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

  // Assign a child to this room. Works for both the row button and the
  // add-by-name modal — the child is inserted into the list (marked Done) so it
  // always appears on this screen after a successful assign.
  const assignChild = async (child) => {
    if (status[child.id] === 'loading' || status[child.id] === 'done') return;
    setStatus((s) => ({ ...s, [child.id]: 'loading' }));
    try {
      await reassignChildRoom(child.id, roomId);
      setChildren((prev) => (prev.some((c) => c.id === child.id) ? prev : [child, ...prev]));
      setStatus((s) => ({ ...s, [child.id]: 'done' }));
    } catch (e) {
      setStatus((s) => ({ ...s, [child.id]: 'idle' }));
      const full = e.status === 409 || /full|capacity|seat|complete/i.test(e.message || '');
      if (full) setRoomFull(true);
      else setError(e.message || 'Could not assign this child.');
    }
  };

  // NOTE: not wired to the backend. No lookup / assign call is made yet — we
  // just surface the "Child Not Found" branch so the flow can be reviewed with
  // the client. Wire the real name lookup + assign here once the behaviour is
  // agreed.
  const handleAddByName = () => {
    setShowAdd(false);
    setNotFound(true);
  };

  const q = query.trim().toLowerCase();
  const filtered = children.filter((c) => (c.fullName || '').toLowerCase().includes(q));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Assign Children</Text>
      </View>

      {/* Search + add (add flow is UI-only for now) */}
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
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <PlusPrimary width={24} height={24} />
        </Pressable>
      </View>

      {/* Children list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 && (
            <Text style={styles.noResults}>
              {children.length === 0 ? 'All children are already assigned to a room.' : 'No children found.'}
            </Text>
          )}
          {filtered.map((child) => {
            const st = status[child.id] || 'idle';
            return (
              <View key={child.id} style={styles.card}>
                <AuthImage
                  path={child.photoUrl}
                  fallback={avatarFallback}
                  style={styles.avatar}
                  contentFit="cover"
                />
                <View style={styles.cardText}>
                  <Text style={styles.name} numberOfLines={1}>{child.fullName}</Text>
                  <Text style={styles.sub}>ID: {shortId(child.id)}</Text>
                </View>

                {st === 'done' ? (
                  <View style={[styles.status, styles.doneBadge]}>
                    <Done width={16} height={16} />
                    <Text style={styles.doneText}>Done</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.status, styles.assignBtn, st === 'loading' && styles.assignBtnBusy]}
                    onPress={() => assignChild(child)}
                    disabled={st === 'loading'}
                  >
                    {st === 'loading' ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Refresh width={16} height={16} />
                        <Text style={styles.assignText}>Assign</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add child by name — UI only, not wired to the backend yet */}
      <AddChildModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddByName}
      />

      {/* Not registered → offer to enroll (opens the invite-parent flow) */}
      <ChildNotFoundModal
        visible={notFound}
        onCancel={() => setNotFound(false)}
        onEnroll={() => {
          setNotFound(false);
          router.push('/invite-parent');
        }}
      />

      {/* Room-full guard */}
      <ErrorModal
        visible={roomFull}
        title="No available seats"
        message={
          room
            ? `${room.name} is full (max ${room.capacity} children). Free up a seat before assigning more.`
            : 'This room has no available seats.'
        }
        buttonText="OK"
        onClose={() => setRoomFull(false)}
      />

      {/* Generic error */}
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
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
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm + 4,
  },
  noResults: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  cardText: { flex: 1, gap: Spacing.xs },
  name: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  sub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.gray,
  },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minWidth: 92,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
  },
  doneBadge: { backgroundColor: Colors.accentSecBg },
  doneText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.accent,
  },
  assignBtn: { backgroundColor: Colors.primary },
  assignBtnBusy: { opacity: 0.7 },
  assignText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.white,
  },
});
