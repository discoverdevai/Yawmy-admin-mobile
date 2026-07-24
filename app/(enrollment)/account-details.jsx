import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Clock from '../../assets/icons/clock.svg';
import StatusActive from '../../assets/icons/status-active.svg';
import StatusExpired from '../../assets/icons/status-expired.svg';
import AuthImage from '../../components/AuthImage';
import ReassignTeacherModal from '../../components/ReassignTeacherModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import LinkChildrenModal from '../../components/LinkChildrenModal';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import ErrorModal from '../../components/ErrorModal';
import { getStaffMember, deleteStaffMember } from '../../services/staffService';
import { getParentMember, linkChildren, deleteParentMember } from '../../services/parentService';
import {
  getRooms,
  getTeacherRooms,
  assignTeacher,
  unassignTeacher,
} from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
const mapStatus = (s) =>
  s === 'PENDING' ? 'pending' : s === 'INVITATION_EXPIRED' ? 'expired' : 'active';

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').slice(0, 2);

function StatusBadge({ status }) {
  if (status === 'pending') {
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <Clock width={16} height={16} />
        <Text style={[styles.badgeText, { color: Colors.gray }]}>Pending</Text>
      </View>
    );
  }
  if (status === 'expired') {
    return (
      <View style={[styles.badge, styles.badgeExpired]}>
        <StatusExpired width={16} height={16} />
        <Text style={[styles.badgeText, { color: Colors.redText }]}>Invitation Expired</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgeActive]}>
      <StatusActive width={16} height={16} />
      <Text style={[styles.badgeText, { color: Colors.primaryText }]}>Active</Text>
    </View>
  );
}

export default function AccountDetails() {
  const router = useRouter();
  const { id, tab = 'staff' } = useLocalSearchParams();
  const isStaff = tab !== 'parents';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [member, setMember] = useState(null);
  const [roomNames, setRoomNames] = useState([]); // staff
  const [assignedRoomIds, setAssignedRoomIds] = useState([]); // staff
  const [linkedChildren, setLinkedChildren] = useState([]); // parents: [{ id, fullName, roomName }]

  const [showReassign, setShowReassign] = useState(false);
  const [reassignRooms, setReassignRooms] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linking, setLinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (isStaff) {
        const [t, tRooms] = await Promise.all([
          getStaffMember(id),
          getTeacherRooms(id).catch(() => []),
        ]);
        setMember({
          id: t.id,
          name: t.fullName,
          role: t.jobTitle || '',
          status: mapStatus(t.status),
          email: t.email,
          imageUrl: t.imageUrl,
          joined: formatDate(t.joinedAt),
        });
        setRoomNames((tRooms || []).map((r) => r.roomName));
        setAssignedRoomIds((tRooms || []).map((r) => r.roomId));
      } else {
        const p = await getParentMember(id);
        setMember({
          id: p.id,
          name: p.fullName,
          role: p.relationship || '',
          status: mapStatus(p.status),
          email: p.email,
          imageUrl: p.imageUrl,
          joined: formatDate(p.joinedAt),
        });
        setLinkedChildren(p.children || []);
      }
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the account.');
    } finally {
      setLoading(false);
    }
  }, [id, isStaff]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/enrollment');
  };

  const openReassign = async () => {
    try {
      const all = await getRooms(false);
      setReassignRooms(all || []);
      setShowReassign(true);
    } catch (e) {
      setError(e.message || 'Could not load rooms.');
    }
  };

  const confirmReassign = async (selectedRoomIds) => {
    setShowReassign(false);
    try {
      const sel = new Set(selectedRoomIds);
      const origSet = new Set(assignedRoomIds);
      for (const rid of selectedRoomIds) if (!origSet.has(rid)) await assignTeacher(rid, id);
      for (const rid of assignedRoomIds) if (!sel.has(rid)) await unassignTeacher(rid, id);
      await load();
      setSuccessMsg('Teacher reassigned successfully!');
    } catch (e) {
      setError(e.message || 'Could not reassign the teacher.');
    }
  };

  const confirmLink = async (childIds) => {
    if (linking || !childIds.length) return;
    setLinking(true);
    try {
      await linkChildren(id, childIds);
      setShowLink(false);
      await load(); // refresh linked children on the detail
      setSuccessMsg('Children linked successfully!');
    } catch (e) {
      setError(e.message || 'Could not link the children.');
    } finally {
      setLinking(false);
    }
  };

  const confirmDelete = async () => {
    setShowDelete(false);
    if (busy) return;
    setBusy(true);
    try {
      await (isStaff ? deleteStaffMember(id) : deleteParentMember(id));
      goBack(); // enrollment refetches on focus → returns to Staff/Parents tab, refreshed
    } catch (e) {
      setError(e.message || `Could not delete the ${isStaff ? 'teacher' : 'parent'}.`);
    } finally {
      setBusy(false);
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
          <Text style={styles.headerTitle}>Account Details</Text>
        </View>
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Account Details</Text>
        </View>
        <Text style={styles.notFound}>This account is no longer available.</Text>
      </SafeAreaView>
    );
  }

  const rows = isStaff
    ? [
        { label: 'Email:', value: member.email || '—' },
        { label: 'Role:', value: member.role || '—' },
        { label: 'Rooms:', value: roomNames.length ? roomNames.join(', ') : '—' },
        { label: 'Joined:', value: member.joined },
      ]
    : [
        { label: 'Email:', value: member.email || '—' },
        { label: 'Role:', value: member.role || '—' },
        {
          label: 'Linked Children:',
          value: linkedChildren.map((c) => c.fullName).join(', ') || '—',
        },
        { label: 'Joined:', value: member.joined },
      ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Account Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {member.imageUrl ? (
              <AuthImage path={member.imageUrl} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initialsOf(member.name)}</Text>
              </View>
            )}
          </View>

          <View style={styles.profileText}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.role}>{member.role}</Text>
          </View>

          <StatusBadge status={member.status} />
        </View>

        {/* Account info */}
        <Text style={styles.sectionLabel}>Account Info</Text>
        <View style={styles.infoCard}>
          {rows.map((r, i) => (
            <View key={r.label} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowDivider]}>
              <Text style={styles.infoKey}>{r.label}</Text>
              <Text style={styles.infoValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Linked children (parents) */}
        {!isStaff && linkedChildren.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Linked Children</Text>
            <View style={styles.infoCard}>
              {linkedChildren.map((c, i) => (
                <View
                  key={c.id}
                  style={[styles.linkedRow, i < linkedChildren.length - 1 && styles.infoRowDivider]}
                >
                  <Text style={styles.linkedText}>
                    {c.fullName}{c.roomName ? `, ${c.roomName}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer actions */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() =>
            router.push(
              isStaff
                ? {
                    pathname: '/edit-teacher',
                    params: { teacherId: String(id), title: 'Edit Account Info' },
                  }
                : { pathname: '/edit-parent', params: { id: String(id), tab } }
            )
          }
        >
          <Text style={styles.primaryText}>Edit Account Info</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            onPress={() => setShowDelete(true)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.reassignBtn, pressed && styles.pressed]}
            onPress={isStaff ? openReassign : () => setShowLink(true)}
          >
            <Text style={styles.reassignText}>{isStaff ? 'Reassign' : 'Link Children'}</Text>
          </Pressable>
        </View>
      </View>

      {isStaff && (
        <ReassignTeacherModal
          visible={showReassign}
          rooms={reassignRooms}
          initialSelected={assignedRoomIds}
          onClose={() => setShowReassign(false)}
          onConfirm={confirmReassign}
        />
      )}

      {!isStaff && (
        <LinkChildrenModal
          visible={showLink}
          parentId={id}
          submitting={linking}
          onClose={() => setShowLink(false)}
          onConfirm={confirmLink}
        />
      )}

      <DeleteChildModal
        visible={showDelete}
        title={isStaff ? 'Delete Teacher?' : 'Delete Parent?'}
        message={
          isStaff
            ? 'Are you sure you want to delete this teacher account? This action cannot be undone.'
            : 'Are you sure you want to delete this parent account? This action cannot be undone, and all linked child associations will be removed.'
        }
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />

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
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  notFound: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },

  content: { padding: Spacing.md, gap: Spacing.md },

  profileCard: {
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.secBg,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  avatarWrap: { width: 80, height: 80 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 36, color: Colors.primaryText },
  profileText: { alignItems: 'center', gap: Spacing.xs },
  name: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  role: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

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

  sectionLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  infoCard: {
    backgroundColor: Colors.secBg,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  infoRowDivider: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  infoKey: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  infoValue: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
    textAlign: 'right',
  },
  linkedRow: { width: '100%' },
  linkedText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.md },
  primaryBtn: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.lightRedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.redText },
  reassignBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassignText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.primary },
  pressed: { opacity: 0.85 },
});
