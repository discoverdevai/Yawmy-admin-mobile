import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Search from '../../assets/icons/search.svg';
import Plus from '../../assets/icons/plus.svg';
import MoreVertical from '../../assets/icons/more-vertical.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import RefreshIcon from '../../assets/icons/refresh-dark.svg';
import Trash from '../../assets/icons/trash.svg';
import AddChildModal from '../../components/AddChildModal';
import ChildNotFoundModal from '../../components/ChildNotFoundModal';
import AlreadyAssignedModal from '../../components/AlreadyAssignedModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import ReassignChildModal from '../../components/ReassignChildModal';
import ReassignTeacherModal from '../../components/ReassignTeacherModal';
import { useRooms } from '../../context/RoomsContext';
import { useEnrollment } from '../../context/EnrollmentContext';
import { CHILDREN, ROOM_CAPACITY, teacherId } from '../../constants/people';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatar = require('../../assets/images/child-avatar.png');
const teacherAvatar = require('../../assets/images/avatar-demo.png');

export default function RoomDetail() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const {
    rooms,
    archivedRooms,
    toggleChild,
    roomOfChild,
    childInfo,
    updateRoom,
    enrolledTeachers,
    deleteTeacher,
    setTeacherRooms,
    teacherInfo,
    enrolledChildren,
    deleteChild,
  } = useRooms();
  const { resetParentDraft, updateParentDraft } = useEnrollment();
  const [tab, setTab] = useState('children');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pendingChildName, setPendingChildName] = useState('');
  const [conflict, setConflict] = useState(null); // { child, room }
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherNotFound, setTeacherNotFound] = useState(false);
  const [pendingTeacherName, setPendingTeacherName] = useState('');
  const [menu, setMenu] = useState({ visible: false, top: 0, childId: null });
  const [deleteChildId, setDeleteChildId] = useState(null);
  const [reassignChildId, setReassignChildId] = useState(null);
  const [teacherMenu, setTeacherMenu] = useState({ visible: false, top: 0, name: null });
  const [deleteTeacherName, setDeleteTeacherName] = useState(null);
  const [reassignTeacherName, setReassignTeacherName] = useState(null);

  const rid = Number(roomId);
  const room = rooms.find((r) => r.id === rid) || archivedRooms.find((r) => r.id === rid);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  if (!room) return <SafeAreaView style={styles.container} edges={['top']} />;

  const q = query.trim().toLowerCase();
  const children = (room.childIds || [])
    .map((id) => CHILDREN.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ ...c, name: childInfo[c.id]?.name ?? c.name }))
    .filter((c) => c.name.toLowerCase().includes(q) || c.childId.includes(q));
  const teachers = (room.teachers || []).filter((t) =>
    (teacherInfo[t]?.name ?? t).toLowerCase().includes(q)
  );

  const onAdd = () => {
    if (tab === 'children') setShowAdd(true);
    else setShowAddTeacher(true);
  };

  // Add a teacher by name — assign if enrolled (in the teachers list), else
  // show the "not found" prompt. Mirrors the add-child flow.
  const handleAddTeacher = (name) => {
    const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const match = enrolledTeachers.find((t) => normalize(t) === normalize(name));
    setShowAddTeacher(false);
    if (!match) {
      setPendingTeacherName(name.trim());
      setTeacherNotFound(true);
      return;
    }
    if (!(room.teachers || []).includes(match)) {
      updateRoom(rid, { teachers: [...(room.teachers || []), match] });
    }
  };

  // Add a child by name — assign if found (one room per child), else show
  // the "not found" prompt; warn if they already belong to another room.
  const handleAddChild = (name) => {
    const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const match = enrolledChildren.find((c) => normalize(c.name) === normalize(name));
    setShowAdd(false);
    if (!match) {
      setPendingChildName(name.trim());
      setNotFound(true);
      return;
    }
    if ((room.childIds || []).includes(match.id)) return; // already in this room
    const other = roomOfChild(match.id, rid);
    if (other) {
      setConflict({ child: match, room: other });
      return;
    }
    toggleChild(rid, match.id);
  };

  // "Enroll Teacher" → open the Enrollment Staff tab's Add Member sheet,
  // prefilled with the typed name, to invite the new teacher.
  const enrollTeacher = () => {
    setTeacherNotFound(false);
    router.push({ pathname: '/enrollment', params: { tab: 'staff', addName: pendingTeacherName } });
  };

  // "Enroll Child" → start the Invite Parent wizard prefilled with the typed
  // child name and this room, so the child is enrolled under the new parent.
  const enrollChild = () => {
    setNotFound(false);
    resetParentDraft();
    updateParentDraft({
      children: [
        {
          image: null,
          name: pendingChildName,
          dob: '',
          roomId: rid,
          roomName: room.name,
          guardians: [],
          pickups: [],
        },
      ],
    });
    router.push('/invite-parent');
  };

  const confirmMove = () => {
    if (conflict) toggleChild(rid, conflict.child.id);
    setConflict(null);
  };

  const openChildMenu = (childId, top) => setMenu({ visible: true, top, childId });
  const closeMenu = () => setMenu((m) => ({ ...m, visible: false }));

  const editChildInfo = () => {
    const childId = menu.childId;
    closeMenu();
    router.push({ pathname: '/edit-child', params: { childId: String(childId), roomId: String(rid) } });
  };

  const requestDeleteChild = () => {
    setDeleteChildId(menu.childId);
    closeMenu();
  };

  const confirmDeleteChild = () => {
    if (deleteChildId != null) deleteChild(deleteChildId); // removes from every room + enrolled list
    setDeleteChildId(null);
  };

  const requestReassign = () => {
    setReassignChildId(menu.childId);
    closeMenu();
  };

  // Other rooms this child could move to, with their available slots.
  const reassignTargets = rooms
    .filter((r) => r.id !== rid)
    .map((r) => ({ ...r, slots: ROOM_CAPACITY - r.childIds.length }));

  const confirmReassign = (targetId) => {
    if (reassignChildId != null) toggleChild(targetId, reassignChildId); // moves child here
    setReassignChildId(null);
  };

  const openTeacherMenu = (name, top) => setTeacherMenu({ visible: true, top, name });
  const closeTeacherMenu = () => setTeacherMenu((m) => ({ ...m, visible: false }));

  const editTeacherInfo = () => {
    const name = teacherMenu.name;
    closeTeacherMenu();
    router.push({ pathname: '/edit-teacher', params: { teacherName: String(name), roomId: String(rid) } });
  };

  const requestDeleteTeacher = () => {
    setDeleteTeacherName(teacherMenu.name);
    closeTeacherMenu();
  };

  const requestReassignTeacher = () => {
    setReassignTeacherName(teacherMenu.name);
    closeTeacherMenu();
  };

  // Rooms this teacher is currently assigned to (checked by default).
  const teacherRoomIds = reassignTeacherName
    ? rooms.filter((r) => (r.teachers || []).includes(reassignTeacherName)).map((r) => r.id)
    : [];

  const confirmReassignTeacher = (roomIds) => {
    if (reassignTeacherName) setTeacherRooms(reassignTeacherName, roomIds);
    setReassignTeacherName(null);
  };

  const confirmDeleteTeacher = () => {
    if (deleteTeacherName) deleteTeacher(deleteTeacherName); // removes from every room + enrolled list
    setDeleteTeacherName(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{room.name}</Text>
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
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Plus width={24} height={24} />
        </Pressable>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {tab === 'children' ? (
          children.length === 0 ? (
            <Text style={styles.empty}>No children in this room.</Text>
          ) : (
            children.map((c) => (
              <View key={c.id} style={styles.card}>
                <Image source={avatar} style={styles.childAvatar} contentFit="cover" />
                <View style={styles.cardText}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.sub}>ID: {c.childId}</Text>
                </View>
                <Pressable
                  style={styles.moreBtn}
                  hitSlop={8}
                  onPress={(e) => openChildMenu(c.id, e.nativeEvent.pageY)}
                >
                  <MoreVertical width={24} height={24} />
                </Pressable>
              </View>
            ))
          )
        ) : teachers.length === 0 ? (
          <Text style={styles.empty}>No teachers assigned.</Text>
        ) : (
          teachers.map((t) => (
            <View key={t} style={styles.card}>
              <Image source={teacherAvatar} style={styles.childAvatar} contentFit="cover" />
              <View style={styles.cardText}>
                <Text style={styles.name}>{teacherInfo[t]?.name ?? t}</Text>
                <Text style={styles.sub}>ID: {teacherId(t)}</Text>
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

      <AddChildModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddChild}
      />

      <ChildNotFoundModal
        visible={notFound}
        onCancel={() => setNotFound(false)}
        onEnroll={enrollChild}
      />

      <AddChildModal
        visible={showAddTeacher}
        title="Add Teacher"
        label="Teacher Name"
        placeholder="Enter teacher name"
        buttonText="Add Teacher"
        onClose={() => setShowAddTeacher(false)}
        onAdd={handleAddTeacher}
      />

      <ChildNotFoundModal
        visible={teacherNotFound}
        title="Teacher Not Found!"
        message="This teacher is not registered in the system. Please enroll them first before assigning them."
        enrollText="Enroll Teacher"
        onCancel={() => setTeacherNotFound(false)}
        onEnroll={enrollTeacher}
      />

      <AlreadyAssignedModal
        visible={!!conflict}
        childName={conflict?.child.name}
        roomName={conflict?.room.name}
        onCancel={() => setConflict(null)}
        onMove={confirmMove}
      />

      {/* Child actions menu */}
      <Modal visible={menu.visible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
          <View style={[styles.menu, { top: menu.top }]}>
            <Pressable style={styles.menuItem} onPress={editChildInfo}>
              <EditIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Edit Info</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={requestReassign}>
              <RefreshIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Reassign</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={requestDeleteChild}>
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
            <Pressable style={styles.menuItem} onPress={editTeacherInfo}>
              <EditIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Edit Info</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={requestReassignTeacher}>
              <RefreshIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Reassign</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={requestDeleteTeacher}>
              <Trash width={24} height={24} />
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <DeleteChildModal
        visible={deleteChildId != null}
        onCancel={() => setDeleteChildId(null)}
        onConfirm={confirmDeleteChild}
      />

      <DeleteChildModal
        visible={deleteTeacherName != null}
        title="Delete Teacher?"
        message="Are you sure you want to delete this teacher account? This action cannot be undone."
        onCancel={() => setDeleteTeacherName(null)}
        onConfirm={confirmDeleteTeacher}
      />

      <ReassignTeacherModal
        visible={reassignTeacherName != null}
        rooms={rooms}
        initialSelected={teacherRoomIds}
        onClose={() => setReassignTeacherName(null)}
        onConfirm={confirmReassignTeacher}
      />

      <ReassignChildModal
        visible={reassignChildId != null}
        rooms={reassignTargets}
        allowFull
        onClose={() => setReassignChildId(null)}
        onConfirm={confirmReassign}
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
  cardText: { flex: 1, gap: Spacing.sm },
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

