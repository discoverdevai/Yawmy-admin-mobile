import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import RoomArchivedModal from '../../components/RoomArchivedModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import ReassignChildModal from '../../components/ReassignChildModal';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useRooms } from '../../context/RoomsContext';
import { ROOM_CAPACITY } from '../../constants/people';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const childAvatar = require('../../assets/images/child-avatar.png');

const TABS = [
  { key: 'staff', label: 'Staff' },
  { key: 'parents', label: 'Parents' },
  { key: 'children', label: 'Children' },
];

const initialsOf = (name) =>
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
  const { listFor, addMember, removeMember } = useEnrollment();
  const { enrolledChildren, rooms, toggleChild, deleteChild } = useRooms();
  const [tab, setTab] = useState(
    tabParam === 'parents' || tabParam === 'children' ? tabParam : 'staff'
  );
  const [query, setQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [prefillName, setPrefillName] = useState('');

  // Coming from "Enroll Teacher": open the Add Member sheet prefilled, once.
  useEffect(() => {
    if (addName) {
      setTab('staff');
      setPrefillName(String(addName));
      setShowAdd(true);
      router.setParams({ addName: '' });
    }
  }, [addName, router]);
  const [showInviteSent, setShowInviteSent] = useState(false);
  // Active filters per tab so switching tabs keeps each tab's own selection.
  const [filters, setFilters] = useState({}); // { [tab]: { statuses, roles } }
  // Children 3-dot menu + its actions.
  const [childMenu, setChildMenu] = useState({ visible: false, top: 0, row: null });
  const [reassignRow, setReassignRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const isChildren = tab === 'children';

  // The Children tab shows every child in the nursery (with their id), plus any
  // children added through the Invite Parent flow.
  const roomNameOf = (childId) => rooms.find((r) => r.childIds.includes(childId))?.name || '';

  const list = isChildren
    ? [
        ...enrolledChildren.map((c) => ({
          id: `n${c.id}`,
          cid: c.id, // real nursery child id (for edit/reassign/delete)
          name: c.name,
          childId: c.childId,
          gender: c.gender,
          ageMonths: c.ageMonths,
          room: roomNameOf(c.id),
        })),
        ...listFor('children').map((c) => ({
          id: `e${c.id}`,
          enrollId: c.id, // id within the enrollment children list
          name: c.name,
          childId: c.childId || '—',
          avatar: c.avatar,
          gender: c.gender,
          ageMonths: c.ageMonths,
          room: c.role || '',
        })),
      ]
    : listFor(tab);

  const childFilter = filters.children || { rooms: [], gender: null, ageMonths: null };
  const tabFilter = filters[tab] || { statuses: [], roles: [] };

  // Role chips for the filter sheet — the distinct roles present in this tab.
  const roleOptions = [...new Set(list.map((m) => m.role).filter(Boolean))];

  const q = query.trim().toLowerCase();
  const filtered = list.filter((m) => {
    if (isChildren) {
      const matchesQuery =
        m.name.toLowerCase().includes(q) || String(m.childId).toLowerCase().includes(q);
      const matchesRoom = childFilter.rooms.length === 0 || childFilter.rooms.includes(m.room);
      const matchesGender = !childFilter.gender || m.gender === childFilter.gender;
      const matchesAge = childFilter.ageMonths == null || (m.ageMonths || 0) <= childFilter.ageMonths;
      return matchesQuery && matchesRoom && matchesGender && matchesAge;
    }
    const matchesQuery =
      m.name.toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q);
    const matchesStatus =
      tabFilter.statuses.length === 0 || tabFilter.statuses.includes(m.status);
    const matchesRole = tabFilter.roles.length === 0 || tabFilter.roles.includes(m.role);
    return matchesQuery && matchesStatus && matchesRole;
  });

  const filterCount = isChildren
    ? childFilter.rooms.length + (childFilter.gender ? 1 : 0) + (childFilter.ageMonths != null ? 1 : 0)
    : tabFilter.statuses.length + tabFilter.roles.length;

  const applyFilter = (selected) => {
    setFilters((f) => ({ ...f, [tab]: selected }));
    setShowFilter(false);
  };

  // --- Children 3-dot menu ---
  const openChildMenu = (row, top) => setChildMenu({ visible: true, top, row });
  const closeChildMenu = () => setChildMenu((m) => ({ ...m, visible: false }));

  const menuEditInfo = () => {
    const row = childMenu.row;
    closeChildMenu();
    if (row?.cid != null) {
      const rid = rooms.find((r) => r.childIds.includes(row.cid))?.id;
      router.push({
        pathname: '/edit-child',
        params: { childId: String(row.cid), roomId: rid != null ? String(rid) : '' },
      });
    }
  };

  const menuReassign = () => {
    const row = childMenu.row;
    closeChildMenu();
    if (row?.cid != null) setReassignRow(row);
  };

  const menuDelete = () => {
    const row = childMenu.row;
    closeChildMenu();
    setDeleteRow(row);
  };

  const confirmDelete = () => {
    if (deleteRow?.cid != null) deleteChild(deleteRow.cid); // nursery child: global delete
    else if (deleteRow?.enrollId != null) removeMember('children', deleteRow.enrollId);
    setDeleteRow(null);
  };

  // All rooms shown (with free slots); the current room is highlighted but
  // non-selectable so a child can't be reassigned to where they already are.
  const reassignTargets = rooms.map((r) => ({ ...r, slots: ROOM_CAPACITY - r.childIds.length }));
  const reassignCurrentRoomId = reassignRow
    ? rooms.find((r) => r.childIds.includes(reassignRow.cid))?.id ?? null
    : null;

  const confirmReassign = (targetId) => {
    if (reassignRow?.cid != null) toggleChild(targetId, reassignRow.cid);
    setReassignRow(null);
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
            <Pressable
              key={t.key}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setTab(t.key)}
            >
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

        {/* Children tab: child cards with ID + 3-dot menu */}
        {isChildren &&
          filtered.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <Image source={m.avatar || childAvatar} style={styles.avatar} contentFit="cover" />
                <View style={styles.cardText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {m.name}
                  </Text>
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
                router.push({
                  pathname: '/account-details',
                  params: { id: String(m.id), tab },
                })
              }
            >
              <View style={styles.cardLeft}>
                {m.avatar ? (
                  <Image source={m.avatar} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initialsOf(m.name)}</Text>
                  </View>
                )}
                <View style={styles.cardText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={styles.role} numberOfLines={1}>
                    {m.role}
                  </Text>
                </View>
              </View>
              <StatusBadge status={m.status} />
            </Pressable>
          ))}
      </ScrollView>

      <BottomTabBar active="enrollment" />

      {isChildren ? (
        <ChildFilterModal
          visible={showFilter}
          rooms={rooms.map((r) => r.name)}
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
        title={
          tab === 'parents' ? 'Add Parent' : tab === 'children' ? 'Add Child' : 'Add Teacher'
        }
        nameLabel={
          tab === 'parents' ? 'Parent Name' : tab === 'children' ? 'Child Name' : 'Teacher Name'
        }
        namePlaceholder={
          tab === 'parents'
            ? 'Enter parent name'
            : tab === 'children'
            ? 'Enter child name'
            : 'Enter teacher name'
        }
        emailPlaceholder={
          tab === 'parents'
            ? 'Enter parent email'
            : tab === 'children'
            ? 'Enter child email'
            : 'Enter teacher email'
        }
        initialName={prefillName}
        onClose={() => {
          setShowAdd(false);
          setPrefillName('');
        }}
        onAdd={(member) => {
          addMember(tab, member);
          setShowAdd(false);
          setPrefillName('');
          setShowInviteSent(true);
        }}
      />

      <RoomArchivedModal
        visible={showInviteSent}
        title="Invitation sent Successfully!"
        onClose={() => setShowInviteSent(false)}
      />

      {/* Children 3-dot menu */}
      <Modal visible={childMenu.visible} transparent animationType="fade" onRequestClose={closeChildMenu}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeChildMenu}>
          <View style={[styles.menu, { top: childMenu.top }]}>
            <Pressable style={styles.menuItem} onPress={menuEditInfo}>
              <EditIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Edit Info</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={menuReassign}>
              <RefreshIcon width={24} height={24} />
              <Text style={styles.menuLabel}>Reassign</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={menuDelete}>
              <Trash width={24} height={24} />
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ReassignChildModal
        visible={!!reassignRow}
        rooms={reassignTargets}
        currentRoomId={reassignCurrentRoomId}
        allowFull
        onClose={() => setReassignRow(null)}
        onConfirm={confirmReassign}
      />

      <DeleteChildModal
        visible={!!deleteRow}
        title="Delete Child?"
        message="Are you sure you want to delete this child? This action cannot be undone and all related records will be removed."
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
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
  tab: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  filterBadgeText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 9,
    color: Colors.white,
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 110,
    gap: Spacing.md,
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
    minHeight: 56,
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
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.primaryText,
  },
  cardText: { flex: 1, gap: Spacing.xs },
  name: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  role: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  childId: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  moreBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Children 3-dot menu
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
    shadowOpacity: 0.08,
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
