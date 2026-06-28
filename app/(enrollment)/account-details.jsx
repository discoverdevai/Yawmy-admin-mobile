import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Clock from '../../assets/icons/clock.svg';
import StatusActive from '../../assets/icons/status-active.svg';
import StatusExpired from '../../assets/icons/status-expired.svg';
import ReassignTeacherModal from '../../components/ReassignTeacherModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import LinkChildrenModal from '../../components/LinkChildrenModal';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useRooms } from '../../context/RoomsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// Parse the stored "Sunflower, Daisy" rooms string into a list of names.
const parseRooms = (str) =>
  (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== 'all rooms');

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
  const { listFor, updateMember, removeMember } = useEnrollment();
  const { rooms, enrolledChildren, deleteChild } = useRooms();
  const [showReassign, setShowReassign] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const member = listFor(tab).find((m) => String(m.id) === String(id));

  // Rooms the member is currently in, matched to real room ids by name.
  const currentRoomIds = member
    ? rooms.filter((r) => parseRooms(member.rooms).includes(r.name)).map((r) => r.id)
    : [];

  const confirmReassign = (roomIds) => {
    const names = rooms.filter((r) => roomIds.includes(r.id)).map((r) => r.name);
    updateMember(tab, member.id, { rooms: names.join(', ') });
    setShowReassign(false);
  };

  const confirmDelete = () => {
    setShowDelete(false);
    // Deleting a parent cascades: every linked child is removed from the
    // nursery (all rooms + the enrolled pool) and from the Children list.
    if (tab === 'parents') {
      (member.linkedChildren || []).forEach((lc) => {
        const child = enrolledChildren.find((c) => c.name === lc.name);
        if (child) deleteChild(child.id);
        const childMember = listFor('children').find((m) => m.name === lc.name);
        if (childMember) removeMember('children', childMember.id);
      });
    }
    removeMember(tab, member.id); // fully removed from the enrollment list
    goBack();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/enrollment');
  };

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

  const isParent = tab === 'parents';
  const linkedChildren = member.linkedChildren || [];

  const rows = isParent
    ? [
        { label: 'Email:', value: member.email || '—' },
        { label: 'Role:', value: member.role || '—' },
        {
          label: 'Linked Children:',
          value: linkedChildren.map((c) => c.name).join(', ') || '—',
        },
        { label: 'Joined:', value: member.joined || '—' },
      ]
    : [
        { label: 'Email:', value: member.email || '—' },
        { label: 'Role:', value: member.role || '—' },
        { label: 'Rooms:', value: member.rooms || '—' },
        { label: 'Joined:', value: member.joined || '—' },
      ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Account Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {member.avatar ? (
              <Image source={member.avatar} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initialsOf(member.name)}</Text>
              </View>
            )}
            {!isParent && (
              <View style={styles.avatarEdit}>
                <EditIcon width={20} height={20} />
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
            <View
              key={r.label}
              style={[styles.infoRow, i < rows.length - 1 && styles.infoRowDivider]}
            >
              <Text style={styles.infoKey}>{r.label}</Text>
              <Text style={styles.infoValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Linked children (parents only) */}
        {isParent && linkedChildren.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Linked Children</Text>
            <View style={styles.infoCard}>
              {linkedChildren.map((c, i) => (
                <View
                  key={`${c.name}-${i}`}
                  style={[
                    styles.linkedRow,
                    i < linkedChildren.length - 1 && styles.infoRowDivider,
                  ]}
                >
                  <Text style={styles.linkedText}>
                    {c.name}, {c.room}
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
            router.push({
              pathname: isParent ? '/edit-parent' : '/edit-account',
              params: { id: String(member.id), tab },
            })
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
            onPress={() => (isParent ? setShowLink(true) : setShowReassign(true))}
          >
            <Text style={styles.reassignText}>{isParent ? 'Link Children' : 'Reassign'}</Text>
          </Pressable>
        </View>
      </View>

      {!isParent && (
        <ReassignTeacherModal
          visible={showReassign}
          rooms={rooms}
          initialSelected={currentRoomIds}
          onClose={() => setShowReassign(false)}
          onConfirm={confirmReassign}
        />
      )}

      {isParent && (
        <LinkChildrenModal
          visible={showLink}
          initialLinked={linkedChildren}
          onClose={() => setShowLink(false)}
          onConfirm={(linked) => {
            updateMember(tab, member.id, { linkedChildren: linked });
            setShowLink(false);
          }}
        />
      )}

      <DeleteChildModal
        visible={showDelete}
        title={isParent ? 'Delete Parent?' : 'Delete Teacher?'}
        message={
          isParent
            ? 'Are you sure you want to delete this parent account? This action cannot be undone, and all linked child associations will be removed.'
            : 'Are you sure you want to delete this teacher account? This action cannot be undone.'
        }
        onCancel={() => setShowDelete(false)}
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
  avatarInitials: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 36,
    color: Colors.primaryText,
  },
  avatarEdit: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  linkedText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },

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
