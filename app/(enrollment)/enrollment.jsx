import { useEffect, useState, useCallback } from 'react';
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
import Search from '../../assets/icons/search.svg';
import Plus from '../../assets/icons/plus.svg';
import Filter from '../../assets/icons/filter.svg';
import Clock from '../../assets/icons/clock.svg';
import StatusActive from '../../assets/icons/status-active.svg';
import StatusExpired from '../../assets/icons/status-expired.svg';
import MoreVertical from '../../assets/icons/more-vertical.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import RefreshIcon from '../../assets/icons/refresh-dark.svg';
import Trash from '../../assets/icons/trash.svg';
import BottomTabBar from '../../components/BottomTabBar';
import FilterModal from '../../components/FilterModal';
import ChildFilterModal from '../../components/ChildFilterModal';
import AddMemberModal from '../../components/AddMemberModal';
import ReassignChildModal from '../../components/ReassignChildModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import ErrorModal from '../../components/ErrorModal';
import AuthImage from '../../components/AuthImage';
import { getStaff, getStaffRoles, inviteTeacher, uploadStaffImage } from '../../services/staffService';
import { getParents } from '../../services/parentService';
import { getChildren, reassignChildRoom, unenrollChild } from '../../services/childrenService';
import { getRooms } from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const childAvatar = require('../../assets/images/child-avatar.png');

const TABS = [
  { key: 'staff', label: 'Staff' },
  { key: 'parents', label: 'Parents' },
  { key: 'children', label: 'Children' },
];

const shortId = (id) => String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
const mapStatus = (s) =>
  s === 'PENDING' ? 'pending' : s === 'INVITATION_EXPIRED' ? 'expired' : 'active';

// Child's age in whole months, derived from their date of birth vs today.
const ageInMonths = (dob) => {
  if (!dob) return null;
  const [y, mo, d] = String(dob).split('-').map(Number);
  if (!y || !mo || !d) return null;
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - (mo - 1));
  if (now.getDate() < d) months -= 1;
  return Math.max(0, months);
};

const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

function StatusBadge({ status }) {
  if (status === 'pending') {
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <Clock width={16} height={16} />
        <Text style={[styles.badgeText, styles.badgeTextPending]}>Pending</Text>
      </View>
    );
  }
  if (status === 'expired') {
    return (
      <View style={[styles.badge, styles.badgeExpired]}>
        <StatusExpired width={16} height={16} />
        <Text style={[styles.badgeText, styles.badgeTextExpired]}>Invitation Expired</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeActive]}>
      <StatusActive width={16} height={16} />
      <Text style={[styles.badgeText, styles.badgeTextActive]}>Active</Text>
    </View>
  );
}

export default function Enrollment() {
  const router = useRouter();
  const { tab: tabParam, addName } = useLocalSearchParams();

  const [tab, setTab] = useState(
    tabParam === 'parents' || tabParam === 'children' ? tabParam : 'staff'
  );
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [staff, setStaff] = useState([]); // [{ id, name, role, status, imageUrl }]
  const [parents, setParents] = useState([]); // [{ id, name, role, status, imageUrl }]
  const [children, setChildren] = useState([]); // [{ id, name, childId, photoUrl, roomId }]

  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({}); // { [tab]: { statuses, roles } }
  const [childMenu, setChildMenu] = useState({ visible: false, top: 0, child: null });
  const [reassignChild, setReassignChild] = useState(null);
  const [reassignRooms, setReassignRooms] = useState([]);
  const [deleteChild, setDeleteChild] = useState(null);

  // Add member (staff invite is wired; parents -> invite-parent).
  const [showAdd, setShowAdd] = useState(false);
  const [prefillName, setPrefillName] = useState('');
  const [staffRoles, setStaffRoles] = useState([]); // [{ value, label }]
  const [showInviteSent, setShowInviteSent] = useState(false);
  // Invite sent, but the member's photo did not upload — reported separately so
  // a failed image never reads as a failed invitation.
  const [photoError, setPhotoError] = useState(null);

  const isChildren = tab === 'children';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([
        getStaff().catch(() => []),
        getParents().catch(() => []),
        getChildren().catch(() => []),
      ]);
      setStaff(
        (s || []).map((m) => ({
          id: m.id,
          name: m.fullName,
          role: m.jobTitle || '',
          status: mapStatus(m.status),
          imageUrl: m.imageUrl,
        }))
      );
      setParents(
        (p || []).map((m) => ({
          id: m.id,
          name: m.fullName,
          role: m.relationship || '',
          status: mapStatus(m.status),
          imageUrl: m.imageUrl,
        }))
      );
      setChildren(
        (c || []).map((m) => ({
          id: m.id,
          name: m.fullName,
          childId: shortId(m.id),
          photoUrl: m.photoUrl,
          roomId: m.roomId,
          roomName: m.roomName || '',
          ageMonths: ageInMonths(m.dob),
        }))
      );
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the enrollment data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Staff-role options for the "Add Teacher" dropdown.
  useEffect(() => {
    getStaffRoles()
      .then((r) => setStaffRoles(Array.isArray(r) ? r : []))
      .catch(() => {});
  }, []);

  // Coming from "Enroll Teacher": open the Add Member sheet prefilled, once.
  useEffect(() => {
    if (addName) {
      setTab('staff');
      setPrefillName(String(addName));
      setShowAdd(true);
      router.setParams({ addName: '' });
    }
  }, [addName, router]);

  const list = isChildren ? children : tab === 'parents' ? parents : staff;
  const tabFilter = filters[tab] || { statuses: [], roles: [] };
  const roleOptions = [...new Set(list.map((m) => m.role).filter(Boolean))];

  // Children filter (rooms + age).
  const childFilter = filters.children || { rooms: [], ageMonths: null };
  const childRoomOptions = [...new Set(children.map((c) => c.roomName).filter(Boolean))];

  const q = query.trim().toLowerCase();
  const filtered = list.filter((m) => {
    if (isChildren) {
      const matchesQuery =
        m.name.toLowerCase().includes(q) || String(m.childId).toLowerCase().includes(q);
      const matchesRoom = childFilter.rooms.length === 0 || childFilter.rooms.includes(m.roomName);
      const matchesAge =
        childFilter.ageMonths == null || (m.ageMonths != null && m.ageMonths <= childFilter.ageMonths);
      return matchesQuery && matchesRoom && matchesAge;
    }
    const matchesQuery =
      m.name.toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q);
    const matchesStatus = tabFilter.statuses.length === 0 || tabFilter.statuses.includes(m.status);
    const matchesRole = tabFilter.roles.length === 0 || tabFilter.roles.includes(m.role);
    return matchesQuery && matchesStatus && matchesRole;
  });

  const filterCount = isChildren
    ? childFilter.rooms.length + (childFilter.ageMonths != null ? 1 : 0)
    : tabFilter.statuses.length + tabFilter.roles.length;

  const applyFilter = (selected) => {
    setFilters((f) => ({ ...f, [tab]: selected }));
    setShowFilter(false);
  };

  // Children 3-dots menu.
  const openChildMenu = (child, top) => setChildMenu({ visible: true, top, child });
  const closeChildMenu = () => setChildMenu((m) => ({ ...m, visible: false }));
  const editChildInfo = () => {
    const child = childMenu.child;
    closeChildMenu();
    if (child) {
      router.push({
        pathname: '/edit-child',
        params: { childId: String(child.id), roomId: child.roomId ? String(child.roomId) : '' },
      });
    }
  };
  // Reassign — load the destination rooms (with slots) and open the picker.
  const reassignChildAction = async () => {
    const child = childMenu.child;
    closeChildMenu();
    if (!child) return;
    try {
      const all = await getRooms(false);
      setReassignRooms(
        (all || []).map((r) => ({
          ...r,
          slots: Math.max((r.capacity ?? 0) - (r.childCount ?? 0), 0),
        }))
      );
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
      await load();
    } catch (e) {
      setError(e.message || 'Could not reassign the child.');
    }
  };

  // Delete — remove the child from the nursery (unenroll).
  const deleteChildAction = () => {
    setDeleteChild(childMenu.child);
    closeChildMenu();
  };

  const confirmDeleteChild = async () => {
    const child = deleteChild;
    setDeleteChild(null);
    if (!child) return;
    try {
      await unenrollChild(child.id);
      await load();
    } catch (e) {
      setError(e.message || 'Could not delete the child.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Enrollment</Text>
        {!isChildren && (
          <Pressable
            style={styles.addBtn}
            onPress={() => (tab === 'parents' ? router.push('/invite-parent') : setShowAdd(true))}
          >
            <Plus width={24} height={24} />
            <Text style={styles.addBtnText}>Add New Member</Text>
          </Pressable>
        )}
      </View>

      {/* Segmented tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
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
        <Pressable style={styles.filterBtn} onPress={() => setShowFilter(true)}>
          <Filter width={24} height={24} />
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Member list */}
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
              {isChildren ? 'No children found.' : 'No members found.'}
            </Text>
          )}

          {/* Children tab: child cards with ID */}
          {isChildren &&
            filtered.map((m) => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <AuthImage
                    path={m.photoUrl}
                    fallback={childAvatar}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                  <View style={styles.cardText}>
                    <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                    <Text style={styles.childId}>ID: {m.childId}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.moreBtn}
                  hitSlop={8}
                  onPress={(e) => openChildMenu(m, e.nativeEvent.pageY)}
                >
                  <MoreVertical width={24} height={24} />
                </Pressable>
              </View>
            ))}

          {/* Staff / Parents tab: cards with role + status badge */}
          {!isChildren &&
            filtered.map((m) => (
              <Pressable
                key={m.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: '/account-details', params: { id: String(m.id), tab } })
                }
              >
                <View style={styles.cardLeft}>
                  {m.imageUrl ? (
                    <AuthImage path={m.imageUrl} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitials}>{initialsOf(m.name)}</Text>
                    </View>
                  )}
                  <View style={styles.cardText}>
                    <Text style={styles.name} numberOfLines={1}>{m.name}</Text>
                    <Text style={styles.role} numberOfLines={1}>{m.role}</Text>
                  </View>
                </View>
                <StatusBadge status={m.status} />
              </Pressable>
            ))}
        </ScrollView>
      )}

      <BottomTabBar active="enrollment" />

      {isChildren ? (
        <ChildFilterModal
          visible={showFilter}
          rooms={childRoomOptions}
          initial={childFilter}
          onClose={() => setShowFilter(false)}
          onApply={applyFilter}
        />
      ) : (
        <FilterModal
          visible={showFilter}
          roles={roleOptions}
          initial={tabFilter}
          onClose={() => setShowFilter(false)}
          onApply={applyFilter}
        />
      )}

      <AddMemberModal
        visible={showAdd}
        title={tab === 'parents' ? 'Add Parent' : 'Add Teacher'}
        nameLabel={tab === 'parents' ? 'Parent Name' : 'Teacher Name'}
        namePlaceholder={tab === 'parents' ? 'Enter parent name' : 'Enter teacher name'}
        emailPlaceholder={tab === 'parents' ? 'Enter parent email' : 'Enter teacher email'}
        initialName={prefillName}
        roles={staffRoles.length ? staffRoles.map((r) => r.label) : undefined}
        onClose={() => {
          setShowAdd(false);
          setPrefillName('');
        }}
        onAdd={async (member) => {
          // Staff = real teacher invite; refetch after.
          if (tab === 'staff') {
            const staffRole = staffRoles.find((r) => r.label === member.role)?.value;
            const res = await inviteTeacher({
              email: member.email,
              fullName: member.name,
              staffRole,
            });
            if (member.avatar?.uri && res?.userId) {
              // Pass the whole asset so the real filename/mime type go up.
              // The invite has already been sent, so a failed photo must not
              // fail the flow — but it is reported rather than dropped, or the
              // teacher silently ends up with an initials avatar forever.
              try {
                await uploadStaffImage(res.userId, member.avatar);
              } catch (e) {
                setPhotoError(e.message || 'The photo could not be uploaded.');
              }
            }
            await load();
          }
          setShowInviteSent(true);
        }}
      />

      <RoomArchivedModal
        visible={showInviteSent}
        title="Invitation sent Successfully!"
        onClose={() => setShowInviteSent(false)}
      />

      <ErrorModal
        visible={!!photoError}
        onClose={() => setPhotoError(null)}
        title="Photo not uploaded"
        message={`The invitation was sent, but the photo could not be uploaded:\n\n${photoError}`}
        buttonText="Continue"
      />

      {/* Children 3-dots menu */}
      <Modal visible={childMenu.visible} transparent animationType="fade" onRequestClose={closeChildMenu}>
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

      {/* Reassign child to another room */}
      <ReassignChildModal
        visible={!!reassignChild}
        rooms={reassignRooms}
        currentRoomId={reassignChild?.roomId || null}
        onClose={() => setReassignChild(null)}
        onConfirm={confirmReassign}
      />

      {/* Delete child from the nursery */}
      <DeleteChildModal
        visible={!!deleteChild}
        title="Delete Child?"
        message="Are you sure you want to delete this child? This action cannot be undone and all related records will be removed."
        onCancel={() => setDeleteChild(null)}
        onConfirm={confirmDeleteChild}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: 15,
    backgroundColor: Colors.primary,
  },
  addBtnText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 12, color: Colors.white },

  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    height: 48,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: Colors.tapsBg,
    borderRadius: Radii.button,
  },
  tab: { flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: Colors.primary },
  tabText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.gray },
  tabTextOn: { color: Colors.white },

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

  list: { paddingHorizontal: Spacing.md, paddingBottom: 110, gap: Spacing.md },
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
    minHeight: 56,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.primaryText },
  cardText: { flex: 1, gap: Spacing.xs },
  name: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  role: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  childId: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
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
  menuLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  menuLabelDanger: { color: Colors.redText },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  badgePending: { backgroundColor: '#F2F2F2' },
  badgeExpired: { backgroundColor: Colors.lightRedBg },
  badgeActive: { backgroundColor: Colors.lightGreen },
  badgeText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 10 },
  badgeTextPending: { color: Colors.gray },
  badgeTextExpired: { color: Colors.redText },
  badgeTextActive: { color: Colors.primaryText },
});
