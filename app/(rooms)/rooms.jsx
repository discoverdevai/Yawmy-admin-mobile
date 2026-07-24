import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Search from '../../assets/icons/search.svg';
import Plus from '../../assets/icons/plus.svg';
import MoreVertical from '../../assets/icons/more-vertical.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import RefreshIcon from '../../assets/icons/refresh-dark.svg';
import ArchiveIcon from '../../assets/icons/archive.svg';
import UnarchiveIcon from '../../assets/icons/unarchive.svg';
import Calendar from '../../assets/icons/calendar.svg';
import RoomIcon from '../../assets/icons/tab-rooms.svg';
import BottomTabBar from '../../components/BottomTabBar';
import AuthImage from '../../components/AuthImage';
import AddRoomModal from '../../components/AddRoomModal';
import EditRoomModal from '../../components/EditRoomModal';
import ArchiveRoomModal from '../../components/ArchiveRoomModal';
import ReassignFirstModal from '../../components/ReassignFirstModal';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import {
  getRooms,
  createRoom,
  uploadRoomImage,
  assignTeacher,
  archiveRoom as archiveRoomApi,
  restoreRoom as restoreRoomApi,
} from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function Rooms() {
  const router = useRouter();
  const { archived } = useLocalSearchParams();

  // Live rooms (active + archived) from the backend.
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false); // archive/restore/create in flight

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('active');
  const [showAdd, setShowAdd] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [noticeKind, setNoticeKind] = useState(null); // 'archived' | 'unarchived' | null
  const [newRoomId, setNewRoomId] = useState(null);
  const [menu, setMenu] = useState({ visible: false, top: 0, room: null });
  const [editRoom, setEditRoom] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);

  // Show the spinner only on the very first load; refocus refetches silently.
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!loadedRef.current) setLoading(true);
    try {
      const data = await getRooms(true); // include archived
      setAllRooms(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load rooms.');
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }, []);

  // Refetch every time the screen gains focus (e.g. after assign/reassign).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // The reassign screen returns here with ?archived=1 after it archives a room.
  useEffect(() => {
    if (archived === '1') {
      setNoticeKind('archived');
      load();
      router.setParams({ archived: '' });
    }
  }, [archived]);

  const openMenu = (room, y) => setMenu({ visible: true, top: y, room });
  const closeMenu = () => setMenu((m) => ({ ...m, visible: false }));

  const handleEdit = (room) => {
    closeMenu();
    setEditRoom(room);
  };

  const handleArchive = (room) => {
    closeMenu();
    // Always confirm the archive first.
    setArchiveTarget(room);
  };

  const confirmArchive = async () => {
    const room = archiveTarget;
    setArchiveTarget(null);
    if (!room) return;
    // A room with children must be emptied first — show the reassign guard;
    // otherwise archive it straight away.
    if ((room.childCount ?? 0) > 0) {
      setReassignTarget(room);
      return;
    }
    setBusy(true);
    try {
      await archiveRoomApi(room.id);
      await load();
      setNoticeKind('archived');
    } catch (e) {
      setError(e.message || 'Could not archive the room.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnarchive = async (room) => {
    closeMenu();
    setBusy(true);
    try {
      await restoreRoomApi(room.id);
      await load();
      setNoticeKind('unarchived');
    } catch (e) {
      setError(e.message || 'Could not unarchive the room.');
    } finally {
      setBusy(false);
    }
  };

  const goReassign = () => {
    const room = reassignTarget;
    setReassignTarget(null);
    if (room) router.push({ pathname: '/reassign-children', params: { roomId: String(room.id) } });
  };

  // Cancel on the reassign guard just returns to Rooms — the room is NOT archived.
  const cancelReassign = () => setReassignTarget(null);

  const assignToRoom = (room) => {
    closeMenu();
    router.push({ pathname: '/assign-children', params: { roomId: String(room.id) } });
  };

  const openSchedule = (room) => {
    closeMenu();
    router.push({
      pathname: '/room-schedule',
      params: { roomId: String(room.id), archived: room.archived ? '1' : '' },
    });
  };

  const openRoom = (room) => {
    router.push({ pathname: '/room-detail', params: { roomId: String(room.id) } });
  };

  // Split the single fetch into the two tabs.
  const activeRooms = allRooms.filter((r) => !r.archived);
  const archivedRooms = allRooms.filter((r) => r.archived);

  // The Active/Archived toggle only appears once something has been archived.
  const hasArchived = archivedRooms.length > 0;
  const activeTab = hasArchived ? tab : 'active';
  const source = activeTab === 'archived' ? archivedRooms : activeRooms;

  const filtered = source.filter((r) =>
    (r.name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleAddRoom = async ({ name, image, teacherIds = [] }) => {
    if (busy) return;
    setBusy(true);
    try {
      // 1. Create the room (name only; capacity defaults to 20 on the backend).
      const room = await createRoom({ name });
      // 2. Upload the logo (mandatory in the form).
      if (image) {
        await uploadRoomImage(room.id, { uri: image });
      }
      // 3. Assign any selected teachers (optional). A room can have several.
      for (const teacherId of teacherIds) {
        await assignTeacher(room.id, teacherId).catch(() => {});
      }
      await load();
      setNewRoomId(room.id);
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not create the room.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <Text style={styles.title}>Rooms</Text>

      {/* Active / Archived toggle — only once a room has been archived */}
      {hasArchived && (
        <View style={styles.toggle}>
          <Pressable
            style={[styles.segment, activeTab === 'active' && styles.segmentOn]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.segmentText, activeTab === 'active' && styles.segmentTextOn]}>
              Active
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, activeTab === 'archived' && styles.segmentOn]}
            onPress={() => setTab('archived')}
          >
            <Text style={[styles.segmentText, activeTab === 'archived' && styles.segmentTextOn]}>
              Archived
            </Text>
          </Pressable>
        </View>
      )}

      {/* Search + add */}
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
          <Plus width={24} height={24} />
        </Pressable>
      </View>

      {/* Rooms list */}
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: Spacing.lg }} color={Colors.primary} />
        ) : (
          <>
            {filtered.length === 0 && (
              <Text style={styles.noResults}>
                {activeTab === 'archived' ? 'No archived rooms.' : 'No rooms found.'}
              </Text>
            )}
            {filtered.map((room) => (
              <Pressable key={room.id} style={styles.card} onPress={() => openRoom(room)}>
                <View style={styles.cardLeft}>
                  <View style={styles.avatar}>
                    {room.imageUrl ? (
                      <AuthImage path={room.imageUrl} style={styles.avatarImg} contentFit="cover" />
                    ) : (
                      <RoomIcon width={24} height={24} />
                    )}
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomCount}>
                      {room.childCount ?? 0} {(room.childCount ?? 0) === 1 ? 'Child' : 'Children'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.moreBtn}
                  hitSlop={8}
                  onPress={(e) => openMenu(room, e.nativeEvent.pageY)}
                >
                  <MoreVertical width={24} height={24} />
                </Pressable>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      <BottomTabBar active="rooms" />

      <AddRoomModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddRoom}
      />

      <EditRoomModal
        visible={!!editRoom}
        room={editRoom}
        onClose={() => setEditRoom(null)}
        onSaved={() => {
          setEditRoom(null);
          load();
          setNoticeKind('updated');
        }}
      />

      <ArchiveRoomModal
        visible={!!archiveTarget}
        roomName={archiveTarget?.name}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />

      <ReassignFirstModal
        visible={!!reassignTarget}
        onCancel={cancelReassign}
        onReassign={goReassign}
      />

      <RoomArchivedModal
        visible={!!noticeKind}
        title={
          noticeKind === 'unarchived'
            ? 'Room unarchived successfully!'
            : noticeKind === 'updated'
              ? 'Room updated successfully!'
              : 'Room Archived Successfully!'
        }
        onClose={() => setNoticeKind(null)}
      />

      <ErrorModal
        visible={!!error && !loading}
        onClose={() => setError(null)}
        title="Something went wrong"
        message={error}
        buttonText="OK"
      />

      <SuccessModal
        visible={showSuccess}
        title="Room Created Successfully!"
        message="The new room is ready. Would you like to assign children now?"
        buttonText="Assign Children Now"
        secondaryText="Do It Later"
        onContinue={() => {
          setShowSuccess(false);
          router.push({
            pathname: '/assign-children',
            params: { roomId: String(newRoomId) },
          });
        }}
        onSecondary={() => setShowSuccess(false)}
      />

      {/* Room actions menu */}
      <Modal visible={menu.visible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
          <View style={[styles.menu, { top: menu.top }]}>
            <Pressable
              style={[styles.menuItem, activeTab === 'archived' && styles.menuItemDisabled]}
              disabled={activeTab === 'archived'}
              onPress={() => menu.room && handleEdit(menu.room)}
            >
              <EditIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Edit Room</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, activeTab === 'archived' && styles.menuItemDisabled]}
              disabled={activeTab === 'archived'}
              onPress={() => menu.room && assignToRoom(menu.room)}
            >
              <RefreshIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Assign Child</Text>
            </Pressable>
            {activeTab === 'archived' ? (
              <Pressable
                style={styles.menuItem}
                onPress={() => menu.room && handleUnarchive(menu.room)}
              >
                <UnarchiveIcon width={24} height={24} />
                <Text style={styles.menuLabel}>Unarchive Room</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.menuItem}
                onPress={() => menu.room && handleArchive(menu.room)}
              >
                <ArchiveIcon width={24} height={24} />
                <Text style={styles.menuLabel}>Archive Room</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.menuItem}
              onPress={() => menu.room && openSchedule(menu.room)}
            >
              <Calendar width={24} height={24} />
              <Text style={styles.menuLabel}>Room Schedule</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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

  toggle: {
    flexDirection: 'row',
    height: 48,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
    backgroundColor: Colors.tapsBg,
    borderRadius: Radii.button,
  },
  segment: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: Colors.primary },
  segmentText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.gray,
  },
  segmentTextOn: { color: Colors.white },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 110,
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
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.button,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 40, height: 40, borderRadius: Radii.button },
  cardText: { gap: Spacing.xs },
  roomName: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  roomCount: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  moreBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions menu
  menu: {
    position: 'absolute',
    right: Spacing.md,
    width: 176,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.sm,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  menuItem: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuItemDisabled: { opacity: 0.4 },
  menuLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
});
