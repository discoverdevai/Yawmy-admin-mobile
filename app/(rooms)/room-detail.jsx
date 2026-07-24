import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Search from '../../assets/icons/search.svg';
import Plus from '../../assets/icons/plus.svg';
import MoreVertical from '../../assets/icons/more-vertical.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import RefreshIcon from '../../assets/icons/refresh-dark.svg';
import Trash from '../../assets/icons/trash.svg';
import AuthImage from '../../components/AuthImage';
import ErrorModal from '../../components/ErrorModal';
import AddChildModal from '../../components/AddChildModal';
import ChildNotFoundModal from '../../components/ChildNotFoundModal';
import AlreadyAssignedModal from '../../components/AlreadyAssignedModal';
import ReassignChildModal from '../../components/ReassignChildModal';
import ReassignTeacherModal from '../../components/ReassignTeacherModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import {
  getRoom,
  getRooms,
  getRoomTeachers,
  getTeachers,
  getTeacherRooms,
  assignTeacher,
  unassignTeacher,
} from '../../services/roomsService';
import { getChildren, reassignChildRoom } from '../../services/childrenService';
import { deleteStaffMember } from '../../services/staffService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatarFallback = require('../../assets/images/child-avatar.png');
const teacherAvatarFallback = require('../../assets/images/avatar-demo.png');
const shortId = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
const normalize = (s) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

export default function RoomDetail() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();

  const [tab, setTab] = useState('children'); // default: children
  const [query, setQuery] = useState('');
  const [room, setRoom] = useState(null);
  const [children, setChildren] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [duplicateName, setDuplicateName] = useState(null); // >1 child with that name
  const [conflict, setConflict] = useState(null); // { id, name, roomName } in another room
  const [busy, setBusy] = useState(false);
  const [childMenu, setChildMenu] = useState({ visible: false, top: 0, child: null });
  const [reassignChild, setReassignChild] = useState(null); // child being reassigned
  const [reassignRooms, setReassignRooms] = useState([]); // destination rooms + slots
  const [deleteChild, setDeleteChild] = useState(null); // child being removed from room
  const [teacherMenu, setTeacherMenu] = useState({ visible: false, top: 0, teacher: null });
  const [reassignTeacher, setReassignTeacher] = useState(null); // { teacherId, assignedIds }
  const [reassignTeacherRooms, setReassignTeacherRooms] = useState([]); // all rooms
  const [deleteTeacher, setDeleteTeacher] = useState(null); // teacher being deleted
  const [successMsg, setSuccessMsg] = useState(null); // success toast text
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherNotFound, setTeacherNotFound] = useState(false);
  const [teacherDuplicateName, setTeacherDuplicateName] = useState(null);
  const [teacherAlreadyIn, setTeacherAlreadyIn] = useState(false);
  const [pendingTeacherName, setPendingTeacherName] = useState('');

  const load = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const [r, kids, tchrs] = await Promise.all([
        getRoom(roomId),
        getChildren({ roomId }),
        getRoomTeachers(roomId).catch(() => []),
      ]);
      setRoom(r);
      setChildren(kids || []);
      setTeachers(tchrs || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the room.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  // Add a child to this room by name: resolve the name against the nursery's
  // children. Handles: none found → enroll prompt; several with the same name →
  // failure; already in another room → confirm move; otherwise assign.
  const handleAddChild = async (name) => {
    setShowAdd(false);
    if (busy) return;
    setBusy(true);
    try {
      const all = await getChildren({ includeUnenrolled: false });
      const matches = (all || []).filter((c) => normalize(c.fullName) === normalize(name));
      if (matches.length === 0) {
        setNotFound(true);
        return;
      }
      if (matches.length > 1) {
        setDuplicateName(name.trim()); // can't tell them apart by name
        return;
      }
      const match = matches[0];
      if (match.roomId === roomId) return; // already in this room
      if (match.roomId) {
        // Lives in another room — confirm before moving.
        setConflict({ id: match.id, name: match.fullName, roomName: match.roomName });
        return;
      }
      await reassignChildRoom(match.id, roomId); // unassigned → assign here
      await load();
    } catch (e) {
      setError(e.message || 'Could not add this child to the room.');
    } finally {
      setBusy(false);
    }
  };

  // Confirm moving a child out of their old room into this one.
  const confirmMove = async () => {
    const c = conflict;
    setConflict(null);
    if (!c) return;
    setBusy(true);
    try {
      await reassignChildRoom(c.id, roomId);
      await load();
    } catch (e) {
      setError(e.message || 'Could not move this child.');
    } finally {
      setBusy(false);
    }
  };

  const openChildMenu = (child, top) => setChildMenu({ visible: true, top, child });
  const closeChildMenu = () => setChildMenu((m) => ({ ...m, visible: false }));

  const editChildInfo = () => {
    const child = childMenu.child;
    closeChildMenu();
    if (child) {
      router.push({
        pathname: '/edit-child',
        params: { childId: String(child.id), roomId: String(roomId) },
      });
    }
  };

  // Reassign: load the destination rooms (with slots) and open the picker.
  const reassignChildAction = async () => {
    const child = childMenu.child;
    closeChildMenu();
    if (!child) return;
    try {
      const all = await getRooms(false); // active rooms
      const targets = (all || []).map((r) => ({
        ...r,
        slots: Math.max((r.capacity ?? 0) - (r.childCount ?? 0), 0),
      }));
      setReassignRooms(targets);
      setReassignChild(child);
    } catch (e) {
      setError(e.message || 'Could not load rooms.');
    }
  };

  const confirmReassign = async (targetRoomId) => {
    const child = reassignChild;
    setReassignChild(null);
    if (!child) return;
    try {
      await reassignChildRoom(child.id, targetRoomId);
      await load(); // child leaves this room → refresh
    } catch (e) {
      setError(e.message || 'Could not reassign the child.');
    }
  };

  // Delete = remove the child from this room (stays enrolled in the nursery).
  const deleteChildAction = () => {
    setDeleteChild(childMenu.child);
    closeChildMenu();
  };

  const confirmDeleteChild = async () => {
    const child = deleteChild;
    setDeleteChild(null);
    if (!child) return;
    try {
      await reassignChildRoom(child.id, null); // unassign from any room
      await load();
    } catch (e) {
      setError(e.message || 'Could not remove the child from the room.');
    }
  };

  // Add a teacher to this room by name: resolve against the nursery's teachers.
  const handleAddTeacher = async (name) => {
    setShowAddTeacher(false);
    if (busy) return;
    setBusy(true);
    try {
      const all = await getTeachers();
      const matches = (all || []).filter((t) => normalize(t.fullName) === normalize(name));
      if (matches.length === 0) {
        setPendingTeacherName(name.trim());
        setTeacherNotFound(true);
        return;
      }
      if (matches.length > 1) {
        setTeacherDuplicateName(name.trim());
        return;
      }
      const match = matches[0];
      if (teachers.some((t) => t.teacherId === match.id)) {
        setTeacherAlreadyIn(true); // already assigned to this room
        return;
      }
      await assignTeacher(roomId, match.id);
      await load();
    } catch (e) {
      setError(e.message || 'Could not add the teacher to the room.');
    } finally {
      setBusy(false);
    }
  };

  // Teacher 3-dots menu.
  const openTeacherMenu = (teacher, top) => setTeacherMenu({ visible: true, top, teacher });
  const closeTeacherMenu = () => setTeacherMenu((m) => ({ ...m, visible: false }));
  const editTeacherAction = () => {
    const t = teacherMenu.teacher;
    closeTeacherMenu();
    if (t) {
      router.push({
        pathname: '/edit-teacher',
        params: { teacherId: String(t.teacherId), roomId: String(roomId) },
      });
    }
  };
  // Reassign a teacher across rooms — load all rooms + the teacher's current rooms.
  const reassignTeacherAction = async () => {
    const t = teacherMenu.teacher;
    closeTeacherMenu();
    if (!t) return;
    try {
      const [all, tRooms] = await Promise.all([
        getRooms(false),
        getTeacherRooms(t.teacherId).catch(() => []),
      ]);
      setReassignTeacherRooms(all || []);
      setReassignTeacher({
        teacherId: t.teacherId,
        assignedIds: (tRooms || []).map((r) => r.roomId),
      });
    } catch (e) {
      setError(e.message || 'Could not load rooms.');
    }
  };

  const confirmReassignTeacher = async (selectedRoomIds) => {
    const ctx = reassignTeacher;
    setReassignTeacher(null);
    if (!ctx) return;
    try {
      const sel = new Set(selectedRoomIds);
      const origSet = new Set(ctx.assignedIds);
      for (const id of selectedRoomIds) {
        if (!origSet.has(id)) await assignTeacher(id, ctx.teacherId);
      }
      for (const id of ctx.assignedIds) {
        if (!sel.has(id)) await unassignTeacher(id, ctx.teacherId);
      }
      await load(); // teacher may have left this room → refresh
      setSuccessMsg('Teacher reassigned successfully!');
    } catch (e) {
      setError(e.message || 'Could not reassign the teacher.');
    }
  };

  const deleteTeacherAction = () => {
    setDeleteTeacher(teacherMenu.teacher);
    closeTeacherMenu();
  };

  const confirmDeleteTeacher = async () => {
    const t = deleteTeacher;
    setDeleteTeacher(null);
    if (!t) return;
    try {
      await deleteStaffMember(t.teacherId); // full removal from the nursery
      await load();
      setSuccessMsg('Teacher deleted successfully!');
    } catch (e) {
      setError(e.message || 'Could not delete the teacher.');
    }
  };

  const q = query.trim().toLowerCase();
  const roomFull = !!room && children.length >= (room.capacity ?? 0);
  const filteredChildren = children.filter((c) => (c.fullName || '').toLowerCase().includes(q));
  const filteredTeachers = teachers.filter((t) => (t.teacherName || '').toLowerCase().includes(q));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header — room name */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{room?.name || 'Room'}</Text>
      </View>

      {/* Children / Teachers toggle */}
      <View style={styles.toggle}>
        <Pressable
          style={[styles.segment, tab === 'children' && styles.segmentOn]}
          onPress={() => setTab('children')}
        >
          <Text style={[styles.segmentText, tab === 'children' && styles.segmentTextOn]}>
            Children
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, tab === 'teachers' && styles.segmentOn]}
          onPress={() => setTab('teachers')}
        >
          <Text style={[styles.segmentText, tab === 'teachers' && styles.segmentTextOn]}>
            Teachers
          </Text>
        </Pressable>
      </View>

      {/* Search + add (add child on the children tab) */}
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
          style={[styles.addBtn, tab === 'children' && roomFull && styles.addBtnDisabled]}
          disabled={tab === 'children' && roomFull}
          onPress={() => (tab === 'children' ? setShowAdd(true) : setShowAddTeacher(true))}
        >
          <Plus width={24} height={24} />
        </Pressable>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tab === 'children' ? (
            filteredChildren.length === 0 ? (
              <Text style={styles.empty}>No children in this room.</Text>
            ) : (
              filteredChildren.map((c) => (
                <View key={c.id} style={styles.card}>
                  <AuthImage
                    path={c.photoUrl}
                    fallback={avatarFallback}
                    style={styles.childAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.cardText}>
                    <Text style={styles.name} numberOfLines={1}>{c.fullName}</Text>
                    <Text style={styles.sub}>ID: {shortId(c.id)}</Text>
                  </View>
                  <Pressable
                    style={styles.moreBtn}
                    hitSlop={8}
                    onPress={(e) => openChildMenu(c, e.nativeEvent.pageY)}
                  >
                    <MoreVertical width={24} height={24} />
                  </Pressable>
                </View>
              ))
            )
          ) : filteredTeachers.length === 0 ? (
            <Text style={styles.empty}>No teachers assigned.</Text>
          ) : (
            filteredTeachers.map((t) => (
              <View key={t.teacherId} style={styles.card}>
                <AuthImage
                  path={t.imageUrl}
                  fallback={teacherAvatarFallback}
                  style={styles.childAvatar}
                  contentFit="cover"
                />
                <View style={styles.cardText}>
                  <Text style={styles.name} numberOfLines={1}>{t.teacherName}</Text>
                  <Text style={styles.sub}>ID: {shortId(t.teacherId)}</Text>
                </View>
                <Pressable
                  style={styles.moreBtn}
                  hitSlop={8}
                  onPress={(e) => openTeacherMenu(t, e.nativeEvent.pageY)}
                >
                  <MoreVertical width={24} height={24} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Child actions menu */}
      <Modal
        visible={childMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={closeChildMenu}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeChildMenu}>
          <View style={[styles.menu, { top: childMenu.top }]}>
            <Pressable style={styles.menuItem} onPress={editChildInfo}>
              <EditIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Edit Info</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={reassignChildAction}>
              <RefreshIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Reassign</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={deleteChildAction}>
              <Trash width={24} height={24} />
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Teacher actions menu */}
      <Modal
        visible={teacherMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={closeTeacherMenu}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeTeacherMenu}>
          <View style={[styles.menu, { top: teacherMenu.top }]}>
            <Pressable style={styles.menuItem} onPress={editTeacherAction}>
              <EditIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Edit Info</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={reassignTeacherAction}>
              <RefreshIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Reassign</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={deleteTeacherAction}>
              <Trash width={24} height={24} />
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Add child by name */}
      <AddChildModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddChild}
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

      {/* More than one child with that name → can't tell them apart */}
      <ErrorModal
        visible={!!duplicateName}
        title="More Than One Child"
        message={`There is more than one child named “${duplicateName}”, so we can't tell them apart by name. Please make their names unique and try again.`}
        buttonText="OK"
        onClose={() => setDuplicateName(null)}
      />

      {/* Child is in another room → confirm the move */}
      <AlreadyAssignedModal
        visible={!!conflict}
        childName={conflict?.name}
        roomName={conflict?.roomName}
        onCancel={() => setConflict(null)}
        onMove={confirmMove}
      />

      {/* Reassign this child to another room */}
      <ReassignChildModal
        visible={!!reassignChild}
        rooms={reassignRooms}
        currentRoomId={roomId}
        onClose={() => setReassignChild(null)}
        onConfirm={confirmReassign}
      />

      {/* Remove this child from the room (stays enrolled) */}
      <DeleteChildModal
        visible={!!deleteChild}
        title="Remove from Room?"
        message="This child will be unassigned from the room but stays enrolled in the nursery. You can add them to a room again later."
        onCancel={() => setDeleteChild(null)}
        onConfirm={confirmDeleteChild}
      />

      {/* Add teacher by name */}
      <AddChildModal
        visible={showAddTeacher}
        title="Add Teacher"
        label="Teacher Name"
        placeholder="Enter teacher name"
        buttonText="Add Teacher"
        onClose={() => setShowAddTeacher(false)}
        onAdd={handleAddTeacher}
      />

      {/* Teacher not registered → offer to enroll (invite a new teacher) */}
      <ChildNotFoundModal
        visible={teacherNotFound}
        title="Teacher Not Found!"
        message="This teacher is not registered in the system. Please enroll them first before assigning them to the room."
        enrollText="Enroll Teacher"
        onCancel={() => setTeacherNotFound(false)}
        onEnroll={() => {
          setTeacherNotFound(false);
          router.push({ pathname: '/enrollment', params: { tab: 'staff', addName: pendingTeacherName } });
        }}
      />

      {/* More than one teacher with that name */}
      <ErrorModal
        visible={!!teacherDuplicateName}
        title="More Than One Teacher"
        message={`There is more than one teacher named “${teacherDuplicateName}”, so we can't tell them apart by name. Please make their names unique and try again.`}
        buttonText="OK"
        onClose={() => setTeacherDuplicateName(null)}
      />

      {/* Teacher already assigned to this room */}
      <ErrorModal
        visible={teacherAlreadyIn}
        title="Already in This Room"
        message="This teacher is already assigned to this room."
        buttonText="OK"
        onClose={() => setTeacherAlreadyIn(false)}
      />

      {/* Reassign teacher across rooms */}
      <ReassignTeacherModal
        visible={!!reassignTeacher}
        rooms={reassignTeacherRooms}
        initialSelected={reassignTeacher?.assignedIds || []}
        onClose={() => setReassignTeacher(null)}
        onConfirm={confirmReassignTeacher}
      />

      {/* Delete teacher from the nursery */}
      <DeleteChildModal
        visible={!!deleteTeacher}
        title="Delete Teacher?"
        message="Are you sure you want to delete this teacher account? This action cannot be undone."
        onCancel={() => setDeleteTeacher(null)}
        onConfirm={confirmDeleteTeacher}
      />

      {/* Success toast (teacher reassigned, etc.) */}
      <RoomArchivedModal
        visible={!!successMsg}
        title={successMsg || ''}
        onClose={() => setSuccessMsg(null)}
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
    flex: 1,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },

  toggle: {
    flexDirection: 'row',
    height: 48,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.tapsBg,
    borderRadius: Radii.button,
  },
  segment: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: Colors.primary },
  segmentText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.gray },
  segmentTextOn: { color: Colors.white },

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
  addBtnDisabled: { opacity: 0.4 },

  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.sm + 4 },
  empty: {
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
  childAvatar: { width: 40, height: 40, borderRadius: 20 },
  cardText: { flex: 1, gap: Spacing.xs },
  name: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  sub: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  moreBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

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
  menuItem: { height: 36, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  menuLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
  menuLabelDanger: { color: Colors.redText },
});
