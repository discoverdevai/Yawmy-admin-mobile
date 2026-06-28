import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Upload from '../../assets/icons/upload.svg';
import LinkIcon from '../../assets/icons/link.svg';
import Calendar from '../../assets/icons/calendar.svg';
import Clock from '../../assets/icons/clock.svg';
import FileDoc from '../../assets/icons/file-doc.svg';
import Trash from '../../assets/icons/trash.svg';
import ShareNursery from '../../assets/icons/share-nursery.svg';
import ShareRoom from '../../assets/icons/share-room.svg';
import SuccessModal from '../../components/SuccessModal';
import DatePickerModal from '../../components/DatePickerModal';
import TimePickerModal from '../../components/TimePickerModal';
import RoomSelectModal from '../../components/RoomSelectModal';
import { useRooms } from '../../context/RoomsContext';
import { ANNOUNCEMENTS } from '../../constants/announcements';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// Media types the upload accepts: images, mp4 video, pdf and word documents.
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Pull the "10:30 PM" portion out of a stored display date like "Mar 30- 10:30 PM".
const extractTime = (display) => {
  const m = /(\d{1,2}:\d{2})\s*(AM|PM)/i.exec(display || '');
  return m ? `${m[1]} ${m[2].toUpperCase()}` : null;
};

// Turn a saved announcement's images + file into editable media items.
const buildInitialMedia = (item) => {
  const imgs = (item.images || []).map((source, i) => ({
    key: `img-${i}`,
    name: `Image ${i + 1}`,
    source,
    mimeType: 'image/png',
  }));
  const files = item.file ? [{ key: 'file', name: item.file, mimeType: 'application/pdf' }] : [];
  return [...imgs, ...files];
};

export default function AddAnnouncement() {
  const router = useRouter();
  const { rooms } = useRooms();
  const { id } = useLocalSearchParams();

  // When an id is supplied we are editing an existing announcement.
  const editItem = id ? ANNOUNCEMENTS.find((a) => a.id === id) : null;
  const editing = !!editItem;

  const [name, setName] = useState(editItem?.title || '');
  const [date, setDate] = useState(editItem?.dateKey || null); // "DD MMM YYYY"
  const [time, setTime] = useState(editItem ? extractTime(editItem.date) : null); // "HH:MM AM/PM"
  const [description, setDescription] = useState(editItem?.body || '');
  const [media, setMedia] = useState(() => (editItem ? buildInitialMedia(editItem) : [])); // [{ key, name, uri?, source?, mimeType }]
  const [link, setLink] = useState(editItem?.link || '');
  const [shareWith, setShareWith] = useState(editItem?.scope || null); // 'nursery' | 'room'
  const [roomId, setRoomId] = useState(
    editItem?.scope === 'room' ? rooms.find((r) => r.name === editItem.room)?.id ?? null : null
  );

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-dismiss the success popup and return to the announcements list.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.replace('/announcements'), 2000);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/announcements');
  };

  // Open the system picker (gallery + files) for the accepted media types.
  const pickMedia = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_TYPES,
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const picked = result.assets.map((a) => ({ key: a.uri, name: a.name, uri: a.uri, mimeType: a.mimeType }));
    setMedia((cur) => [...cur, ...picked]);
  };

  const removeMedia = (key) => setMedia((cur) => cur.filter((m) => m.key !== key));

  const selectedRoom = rooms.find((r) => r.id === roomId);

  // Tap the "Specific Room" card → mark it and open the room picker.
  const onPickSpecificRoom = () => {
    setShareWith('room');
    setShowRoom(true);
  };

  const valid =
    name.trim() &&
    date &&
    time &&
    description.trim() &&
    media.length > 0 &&
    link.trim() &&
    (shareWith === 'nursery' || (shareWith === 'room' && roomId));

  const publish = () => {
    if (!valid) return;
    setShowSuccess(true);
  };

  // Open the preview screen with everything entered so far.
  const preview = () => {
    const data = {
      name,
      date,
      time,
      description,
      media,
      link,
      shareWith,
      roomName: selectedRoom?.name || null,
    };
    router.push({ pathname: '/announcement-preview', params: { data: JSON.stringify(data) } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? 'Edit Announcement' : 'Add Announcement'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Announcement Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter Announcement name"
              placeholderTextColor={Colors.gray}
            />
          </View>
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.labelSm}>Announcement Date</Text>
          <Pressable style={styles.selectBox} onPress={() => setShowDate(true)}>
            <Text style={[styles.selectText, !date && styles.selectPlaceholder]}>
              {date || 'Select Date'}
            </Text>
            <Calendar width={24} height={24} />
          </Pressable>
        </View>

        {/* Time */}
        <View style={styles.field}>
          <Text style={styles.label}>Announcement Time</Text>
          <Pressable style={styles.selectBox} onPress={() => setShowTime(true)}>
            <Text style={[styles.selectText, !time && styles.selectPlaceholder]}>
              {time || 'Select Announcement time'}
            </Text>
            <Clock width={24} height={24} />
          </Pressable>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Announcement Description</Text>
          <View style={styles.textareaBox}>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter Announcement description"
              placeholderTextColor={Colors.gray}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Upload media */}
        <View style={styles.field}>
          <Text style={styles.label}>Upload Media</Text>
          <Pressable style={styles.upload} onPress={pickMedia}>
            <Upload width={24} height={24} />
            <Text style={styles.uploadText}>Tap to upload your media</Text>
            <Text style={styles.uploadHint}>(JPG, PNG, MP4, PDF, Word)</Text>
          </Pressable>

          {/* Image / video previews — each with a delete badge to remove & re-upload */}
          {media.some((m) => (m.mimeType || '').startsWith('image/')) && (
            <View style={styles.thumbWrap}>
              {media
                .filter((m) => (m.mimeType || '').startsWith('image/'))
                .map((m) => (
                  <View key={m.key} style={styles.thumb}>
                    <Image source={m.source ?? { uri: m.uri }} style={styles.thumbImg} contentFit="cover" />
                    <Pressable style={styles.thumbDelete} onPress={() => removeMedia(m.key)} hitSlop={6}>
                      <Trash width={18} height={18} />
                    </Pressable>
                  </View>
                ))}
            </View>
          )}

          {/* Documents / videos — chip with a delete icon */}
          {media
            .filter((m) => !(m.mimeType || '').startsWith('image/'))
            .map((m) => (
              <View key={m.key} style={styles.fileChip}>
                <FileDoc width={24} height={24} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {m.name}
                </Text>
                <Pressable hitSlop={8} onPress={() => removeMedia(m.key)}>
                  <Trash width={20} height={20} />
                </Pressable>
              </View>
            ))}
        </View>

        {/* Attach link */}
        <View style={styles.field}>
          <Text style={styles.label}>Attach Link</Text>
          <View style={styles.inputBox}>
            <LinkIcon width={24} height={24} />
            <TextInput
              style={styles.input}
              value={link}
              onChangeText={setLink}
              placeholder="Enter link here"
              placeholderTextColor={Colors.gray}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Share with */}
        <View style={styles.field}>
          <Text style={styles.label}>Share With</Text>
          <View style={styles.shareRow}>
            <Pressable
              style={[styles.shareCard, shareWith === 'nursery' && styles.shareCardOn]}
              onPress={() => setShareWith('nursery')}
            >
              <ShareNursery width={40} height={40} />
              <Text style={[styles.shareText, shareWith === 'nursery' && styles.shareTextOn]}>
                Nursery-Wide
              </Text>
            </Pressable>
            <Pressable
              style={[styles.shareCard, shareWith === 'room' && styles.shareCardOn]}
              onPress={onPickSpecificRoom}
            >
              <ShareRoom width={40} height={40} />
              <Text style={[styles.shareText, shareWith === 'room' && styles.shareTextOn]}>
                Specific Room
              </Text>
            </Pressable>
          </View>

          {shareWith === 'room' && selectedRoom && (
            <Pressable style={styles.roomChip} onPress={() => setShowRoom(true)}>
              <Text style={styles.roomChipText}>{selectedRoom.name}</Text>
              <Text style={styles.roomChipChange}>Change</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !valid && styles.ctaDisabled]}
          onPress={publish}
          disabled={!valid}
        >
          <Text style={styles.ctaText}>Publish</Text>
        </Pressable>
        <Pressable style={styles.ctaOutline} onPress={preview}>
          <Text style={styles.ctaOutlineText}>Preview</Text>
        </Pressable>
      </View>

      <DatePickerModal
        visible={showDate}
        value={date}
        format="DD MMM YYYY"
        onClose={() => setShowDate(false)}
        onSelect={setDate}
      />

      <TimePickerModal
        visible={showTime}
        initial={time}
        onCancel={() => setShowTime(false)}
        onConfirm={(t) => {
          setTime(t);
          setShowTime(false);
        }}
      />

      <RoomSelectModal
        visible={showRoom}
        rooms={rooms}
        initialRoomId={roomId}
        onClose={() => setShowRoom(false)}
        onConfirm={(id) => {
          setRoomId(id);
          setShowRoom(false);
        }}
      />

      <SuccessModal
        visible={showSuccess}
        title={editing ? 'Announcement Updated Successfully!' : 'Announcement Shared Successfully!'}
        message=""
        buttonText=""
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

  content: { padding: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.lg },
  field: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  labelSm: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },

  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  input: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  selectBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  selectText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  selectPlaceholder: { color: Colors.gray },

  textareaBox: {
    height: 129,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
  },
  textarea: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  upload: {
    height: 106,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderStyle: 'dashed',
    borderRadius: Radii.md,
  },
  uploadText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },
  uploadHint: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, marginTop: -Spacing.xs },

  thumbWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  thumb: { width: 101, height: 71, borderRadius: Radii.button },
  thumbImg: { width: 101, height: 71, borderRadius: Radii.button },
  thumbDelete: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: Colors.secBg,
  },
  fileName: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: Colors.textBlack },

  shareRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  shareCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  shareCardOn: { backgroundColor: Colors.primaryBgLight, borderColor: Colors.primary },
  shareText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  shareTextOn: { color: Colors.primaryText },

  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: Radii.button,
    backgroundColor: Colors.primaryBgLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roomChipText: { fontFamily: Fonts.medium, fontWeight: '600', fontSize: 14, color: Colors.primaryText },
  roomChipChange: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.accent },

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.md },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
  ctaOutline: {
    height: 48,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOutlineText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.primary },
});
