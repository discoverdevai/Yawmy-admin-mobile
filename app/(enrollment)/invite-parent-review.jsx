import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import ErrorModal from '../../components/ErrorModal';
import { useEnrollment } from '../../context/EnrollmentContext';
import {
  inviteFamily,
  uploadChildPhoto,
  toIsoDate,
  parseContact,
} from '../../services/enrollmentService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

// Stored contact label is "Relation – Name"; review shows "Name, Relation, phone".
const contactReview = (c) => {
  const [rel, ...rest] = (c.label || '').split('–');
  const name = rest.join('–').trim();
  return `${name}, ${rel.trim()}, ${c.phone}`;
};

function InfoCard({ rows }) {
  return (
    <View style={styles.infoCard}>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowDivider]}>
          <Text style={styles.infoKey}>{r.label}</Text>
          <Text style={styles.infoValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function InviteParentReview() {
  const router = useRouter();
  const { parentDraft, resetParentDraft } = useEnrollment();
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { name, email, relationship, children = [] } = parentDraft;
  const multi = children.length > 1;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/invite-parent-child');
  };

  const childRows = (kid) => [
    { label: 'Name:', value: kid.name || '—' },
    { label: 'Date of birth:', value: kid.dob || '—' },
    { label: 'Room:', value: kid.roomName || '—' },
    ...kid.guardians.map((g, i) => ({ label: `Guardian ${i + 1}:`, value: contactReview(g) })),
    ...kid.pickups.map((p, i) => ({ label: `Pickup ${i + 1}:`, value: contactReview(p) })),
  ];

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 1. Atomic enroll: parent + children + guardians (emergency contacts) + pickups.
      const payload = {
        parent: { email, fullName: name, relationship },
        children: children.map((c) => ({
          fullName: c.name,
          dob: toIsoDate(c.dob),
          roomId: c.roomId,
          guardians: (c.guardians || []).map(parseContact),
          pickups: (c.pickups || []).map(parseContact),
        })),
      };
      const res = await inviteFamily(payload);

      // 2. Upload each child's image (response children are in the same order).
      await Promise.all(
        (res.children || []).map((rc, i) => {
          const uri = children[i]?.image;
          return uri ? uploadChildPhoto(rc.childId, uri).catch(() => {}) : null;
        })
      );

      // The Enrollment list refetches from the API on focus, so the new parent
      // + children appear there without any local optimistic update.
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not send the invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Invite Parent</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step progress */}
        <View style={styles.stepBlock}>
          <View style={styles.stepBars}>
            <View style={[styles.stepBar, styles.stepBarOn]} />
            <View style={[styles.stepBar, styles.stepBarOn]} />
            <View style={[styles.stepBar, styles.stepBarOn]} />
          </View>
          <View style={styles.stepLabelRow}>
            <Text style={styles.stepTitle}>Review &amp; Add</Text>
            <Text style={styles.stepCount}>Step 3 of 3</Text>
          </View>
        </View>

        {/* Parent info */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Parent Info</Text>
          <Pressable style={styles.editBtn} onPress={() => router.push('/invite-parent')}>
            <EditIcon width={24} height={24} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
        <InfoCard
          rows={[
            { label: 'Email:', value: email || '—' },
            { label: 'Name:', value: name || '—' },
            { label: 'Relationship to child:', value: relationship || '—' },
          ]}
        />

        <View style={styles.divider} />

        {/* Child info (one block per child) */}
        {children.map((kid, idx) => (
          <View key={idx} style={styles.childSection}>
            <View style={styles.sectionHead}>
              <View style={styles.childTitleRow}>
                {kid.image ? (
                  <Image source={{ uri: kid.image }} style={styles.childAvatar} contentFit="cover" />
                ) : (
                  <View style={styles.childAvatarFallback}>
                    <Text style={styles.childInitials}>{initialsOf(kid.name)}</Text>
                  </View>
                )}
                <Text style={styles.sectionLabel}>{multi ? `Child ${idx + 1} Info` : 'Child Info'}</Text>
              </View>
              <Pressable style={styles.editBtn} onPress={() => router.push('/invite-parent-child')}>
                <EditIcon width={24} height={24} />
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
            <InfoCard rows={childRows(kid)} />
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, submitting && styles.pressed, pressed && styles.pressed]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={styles.ctaText}>{submitting ? 'Sending…' : 'Add And Sent Invitation'}</Text>
        </Pressable>
      </View>

      <RoomArchivedModal
        visible={showSuccess}
        title="Invitation sent Successfully!"
        onClose={() => {
          setShowSuccess(false);
          resetParentDraft();
          // Clear the whole wizard (step 1/2/3) from the stack so the phone's
          // back button doesn't walk back through the invite steps.
          if (router.canDismiss()) router.dismissAll();
          router.replace({ pathname: '/enrollment', params: { tab: 'parents' } });
        }}
      />

      <ErrorModal
        visible={!!error}
        onClose={() => setError(null)}
        title="Invitation failed"
        message={error}
        buttonText="Try Again"
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

  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg },

  stepBlock: { gap: Spacing.sm + 4, marginBottom: Spacing.sm },
  stepBars: { flexDirection: 'row', gap: Spacing.sm },
  stepBar: { flex: 1, height: 2, borderRadius: 100, backgroundColor: Colors.tapsBg },
  stepBarOn: { backgroundColor: Colors.primary },
  stepLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 18, color: Colors.textBlack },
  stepCount: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  childTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  childAvatar: { width: 40, height: 40, borderRadius: 20 },
  childAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childInitials: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.primaryText },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.primary },

  infoCard: {
    backgroundColor: Colors.secBg,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.sm,
    marginTop: Spacing.sm + 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  infoRowDivider: { paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  infoKey: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 10, color: Colors.gray },
  infoValue: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.textBlack,
    textAlign: 'right',
  },

  divider: { height: 1, backgroundColor: Colors.secStroke, marginVertical: Spacing.sm },
  childSection: {},

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
