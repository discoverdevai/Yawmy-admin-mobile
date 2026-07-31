import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Upload from '../../assets/icons/upload.svg';
import Calendar from '../../assets/icons/calendar.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Check from '../../assets/icons/check.svg';
import Plus from '../../assets/icons/plus.svg';
import UserIcon from '../../assets/icons/user.svg';
import CallIcon from '../../assets/icons/call.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Trash from '../../assets/icons/trash.svg';
import AddContactModal from '../../components/AddContactModal';
import DatePickerModal from '../../components/DatePickerModal';
import ErrorModal from '../../components/ErrorModal';
import { useEnrollment } from '../../context/EnrollmentContext';
import { getAssignableRooms } from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const makeChild = () => ({
  image: null,
  name: '',
  dob: '',
  roomId: null,
  guardians: [],
  pickups: [],
});

export default function InviteParentChild() {
  const router = useRouter();
  const { parentDraft, updateParentDraft } = useEnrollment();
  // Only ACTIVE rooms that still have space (childCount < capacity) — from the API.
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    getAssignableRooms()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  const [kids, setKids] = useState(() =>
    parentDraft.children && parentDraft.children.length ? parentDraft.children : [makeChild()]
  );
  const [roomOpenFor, setRoomOpenFor] = useState(null); // child index whose room dd is open
  const [dateFor, setDateFor] = useState(null); // child index whose date picker is open
  const [contactCtx, setContactCtx] = useState(null); // { kind, index } | null
  const [notice, setNotice] = useState(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/invite-parent');
  };

  const patchKid = (i, patch) => setKids((list) => list.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  const addKid = () => setKids((list) => [...list, makeChild()]);

  const pickImage = async (i) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setNotice({ title: 'Permission needed', message: 'Please allow photo access to upload an image.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      selectionLimit: 1,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      // Keep the filename and mime type, not just the uri — the upload declares
      // the file with them, and guessing "image/jpeg" mislabels PNG/HEIC picks.
      const a = result.assets[0];
      patchKid(i, { image: { uri: a.uri, fileName: a.fileName, mimeType: a.mimeType } });
    }
  };

  const onSaveContact = (contact) => {
    if (!contactCtx) return;
    const { kind, index, contactIndex } = contactCtx;
    setKids((list) =>
      list.map((k, idx) => {
        if (idx !== index) return k;
        const arr = [...k[kind]];
        if (contactIndex != null) arr[contactIndex] = contact; // editing existing
        else arr.push(contact); // adding new
        return { ...k, [kind]: arr };
      })
    );
  };

  const editContact = (kind, index, contactIndex) => setContactCtx({ kind, index, contactIndex });

  const deleteContact = (kind, index, contactIndex) =>
    setKids((list) =>
      list.map((k, idx) =>
        idx === index ? { ...k, [kind]: k[kind].filter((_, ci) => ci !== contactIndex) } : k
      )
    );

  const editingContact =
    contactCtx && contactCtx.contactIndex != null
      ? kids[contactCtx.index]?.[contactCtx.kind]?.[contactCtx.contactIndex]
      : undefined;

  // Every child must have an image, name, date of birth and a room.
  const kidComplete = (k) => !!k.image && k.name.trim().length > 0 && k.dob.trim().length > 0 && !!k.roomId;
  const canReview = kids.every(kidComplete);

  const review = () => {
    if (!canReview) return;
    updateParentDraft({
      children: kids.map((k) => ({ ...k, roomName: rooms.find((r) => r.id === k.roomId)?.name || '' })),
    });
    router.push('/invite-parent-review');
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

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step progress */}
        <View style={styles.stepBlock}>
          <View style={styles.stepBars}>
            <View style={[styles.stepBar, styles.stepBarOn]} />
            <View style={[styles.stepBar, styles.stepBarOn]} />
            <View style={styles.stepBar} />
          </View>
          <View style={styles.stepLabelRow}>
            <Text style={styles.stepTitle}>Child Info</Text>
            <Text style={styles.stepCount}>Step 2 of 3</Text>
          </View>
        </View>

        {/* One block per child */}
        {kids.map((kid, i) => {
          const selectedRoom = rooms.find((r) => r.id === kid.roomId);
          return (
            <View key={i} style={styles.childBlock}>
              {/* Child image */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Child Image</Text>
                <Pressable style={styles.uploadBox} onPress={() => pickImage(i)}>
                  {kid.image ? (
                    <Image source={{ uri: kid.image.uri }} style={styles.preview} contentFit="cover" />
                  ) : (
                    <View style={styles.uploadPrompt}>
                      <Upload width={24} height={24} />
                      <Text style={styles.uploadText}>
                        Tap to upload your media{'\n'}(JPG, PNG)
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Child name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Child Name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={kid.name}
                    onChangeText={(t) => patchKid(i, { name: t })}
                    placeholder="Enter child name"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
              </View>

              {/* Date of birth */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Date of birth</Text>
                <Pressable style={styles.inputBox} onPress={() => setDateFor(i)}>
                  <Text style={[styles.input, !kid.dob && styles.placeholder]}>
                    {kid.dob || 'DD/MM/YYYY'}
                  </Text>
                  <Calendar width={24} height={24} />
                </Pressable>
              </View>

              {/* Room */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Room</Text>
                <Pressable
                  style={[styles.inputBox, roomOpenFor === i && styles.inputBoxOpen]}
                  onPress={() => setRoomOpenFor((cur) => (cur === i ? null : i))}
                >
                  <Text style={[styles.input, !selectedRoom && styles.placeholder]}>
                    {selectedRoom?.name || 'Choose room'}
                  </Text>
                  <ChevronDown
                    width={24}
                    height={24}
                    style={roomOpenFor === i ? styles.chevronUp : undefined}
                  />
                </Pressable>
                {roomOpenFor === i && (
                  <View style={styles.dropdownPanel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {rooms.map((r) => (
                        <Pressable
                          key={r.id}
                          style={styles.optionRow}
                          onPress={() => {
                            patchKid(i, { roomId: r.id });
                            setRoomOpenFor(null);
                          }}
                        >
                          <Text style={styles.optionName}>{r.name}</Text>
                          {kid.roomId === r.id && <Check width={16} height={16} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Guardians / pickup */}
              <View style={styles.actionRow}>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => setContactCtx({ kind: 'guardians', index: i })}
                >
                  <UserIcon width={16} height={16} />
                  <Text style={styles.outlineText}>
                    Add Guardian{kid.guardians.length ? ` (${kid.guardians.length})` : ''}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => setContactCtx({ kind: 'pickups', index: i })}
                >
                  <CallIcon width={16} height={16} />
                  <Text style={styles.outlineText}>
                    Add Pickup{kid.pickups.length ? ` (${kid.pickups.length})` : ''}
                  </Text>
                </Pressable>
              </View>

              {/* Saved contacts, grouped by section like the Edit Child screen */}
              {[
                { kind: 'guardians', title: 'Guardians' },
                { kind: 'pickups', title: 'Pickup Contacts' },
              ].map(({ kind, title }) =>
                kid[kind].length > 0 ? (
                  <View key={kind} style={styles.contactGroup}>
                    <Text style={styles.contactGroupTitle}>{title}</Text>
                    {kid[kind].map((c, ci) => (
                      <View key={`${kind}-${ci}`} style={styles.contactCard}>
                        <View style={styles.contactLeft}>
                          <Text style={styles.contactLabel} numberOfLines={1}>
                            {c.label}
                          </Text>
                          <View style={styles.contactPhoneRow}>
                            <CallIcon width={16} height={16} />
                            <Text style={styles.contactPhone}>{c.phone}</Text>
                          </View>
                        </View>
                        <View style={styles.contactActions}>
                          <Pressable onPress={() => editContact(kind, i, ci)} hitSlop={6}>
                            <EditIcon width={24} height={24} />
                          </Pressable>
                          <Pressable onPress={() => deleteContact(kind, i, ci)} hitSlop={6}>
                            <Trash width={24} height={24} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null
              )}
            </View>
          );
        })}

        {/* Add another child — stays at the bottom */}
        <Pressable style={styles.dashedBtn} onPress={addKid}>
          <View style={styles.dashedPlus}>
            <Plus width={16} height={16} />
          </View>
          <Text style={styles.dashedText}>Add another child</Text>
        </Pressable>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.prevBtn} onPress={goBack}>
          <Text style={styles.prevText}>Previous</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.reviewBtn,
            !canReview && styles.reviewBtnDisabled,
            pressed && canReview && styles.pressed,
          ]}
          onPress={review}
          disabled={!canReview}
        >
          <Text style={styles.reviewText}>Review</Text>
        </Pressable>
      </View>

      <AddContactModal
        visible={!!contactCtx}
        title={contactCtx?.kind === 'pickups' ? 'Add Pickup Contacts' : 'Add Guardian'}
        contact={editingContact}
        nameFirst
        relationFree
        nameLabel="Name"
        namePlaceholder="Enter name"
        onClose={() => setContactCtx(null)}
        onSave={onSaveContact}
      />

      <DatePickerModal
        visible={dateFor !== null}
        value={dateFor !== null ? kids[dateFor]?.dob : ''}
        onClose={() => setDateFor(null)}
        onSelect={(d) => dateFor !== null && patchKid(dateFor, { dob: d })}
      />

      <ErrorModal
        visible={!!notice}
        title={notice?.title}
        message={notice?.message}
        buttonText="OK"
        onClose={() => setNotice(null)}
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

  content: { padding: Spacing.md, gap: Spacing.md },

  stepBlock: { gap: Spacing.sm + 4, marginBottom: Spacing.sm },
  stepBars: { flexDirection: 'row', gap: Spacing.sm },
  stepBar: { flex: 1, height: 2, borderRadius: 100, backgroundColor: Colors.tapsBg },
  stepBarOn: { backgroundColor: Colors.primary },
  stepLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 18, color: Colors.textBlack },
  stepCount: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  childBlock: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },

  uploadBox: {
    height: 106,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderStyle: 'dashed',
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm + 4,
    overflow: 'hidden',
  },
  uploadPrompt: { alignItems: 'center', gap: Spacing.sm },
  uploadText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },
  preview: { width: '100%', height: '100%' },

  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  inputBoxOpen: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  input: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  placeholder: { color: Colors.gray },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdownPanel: {
    maxHeight: 180,
    backgroundColor: Colors.tapsBg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    overflow: 'hidden',
  },
  optionRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionName: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },

  actionRow: { flexDirection: 'row', gap: Spacing.sm + 4 },
  outlineBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radii.button,
  },
  outlineText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 12, color: Colors.primaryText },

  contactGroup: { gap: Spacing.sm },
  contactGroupTitle: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryBg,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
  },
  contactLeft: { flex: 1, gap: Spacing.sm },
  contactLabel: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 14, color: Colors.textBlack },
  contactPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  contactPhone: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },

  dashedBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: Radii.button,
  },
  dashedPlus: {
    width: 24,
    height: 24,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.primary },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  prevBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.primary },
  reviewBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  reviewText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
