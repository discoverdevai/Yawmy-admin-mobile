import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
import AuthImage from '../../components/AuthImage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import DatePickerModal from '../../components/DatePickerModal';
import TimePickerModal from '../../components/TimePickerModal';
import RoomSelectModal from '../../components/RoomSelectModal';
import { useAuth } from '../../context/AuthContext';
import { fileUrl } from '../../config/api';
import {
  getAnnouncement,
  submitAnnouncementUpdate,
  submitAnnouncementCreate,
} from '../../services/announcementService';
import { getRooms } from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const roomPlaceholder = require('../../assets/images/rooms/sunflower.png');

// Media types the picker accepts: images, video, pdf, word and excel.
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOC_EXT = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
};

// "2024-03-30" -> "Mar 30"
const fmtDate = (s) => {
  if (!s) return '';
  const [, m, d] = s.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${d}` : '';
};
// "22:30:00" -> "10:30 PM"
const fmtTime = (s) => {
  if (!s) return '';
  const [hh, mm] = s.split(':').map(Number);
  if (Number.isNaN(hh)) return '';
  const period = hh < 12 ? 'AM' : 'PM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
};

// "15 Aug 2020" -> "2020-08-15"
const toISODate = (s) => {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec((s || '').trim());
  if (!m) return null;
  const mon = MONTHS.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (mon < 0) return null;
  return `${m[3]}-${String(mon + 1).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
};
// "10:30 PM" -> "22:30:00"
const to24Time = (s) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((s || '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}:00`;
};
// "2024-03-30" -> "30 Mar 2024" (the date picker's display format)
const toDisplayDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return m ? `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}` : null;
};

const isImageItem = (m) => (m.mimeType || '').startsWith('image/') || m.type === 'PHOTO';
const mediaName = (m) => m.name || `Attachment.${(DOC_EXT[m.mimeType] || 'FILE').toLowerCase()}`;

export default function AddAnnouncement() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const editing = !!id;

  const [loading, setLoading] = useState(editing);
  const [rooms, setRooms] = useState([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState(null); // add mode: "DD MMM YYYY"
  const [time, setTime] = useState(null); // add mode: "HH:MM AM/PM"
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState([]); // existing {key,existingId,type,mimeType,fileUrl} + new {key,uri,name,mimeType}
  const [link, setLink] = useState(''); // add mode: single link input
  const [links, setLinks] = useState([]); // edit mode: existing links (deletable)
  const [shareWith, setShareWith] = useState(null); // 'nursery' | 'room'
  const [roomId, setRoomId] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const mapRoom = (r) => ({
    id: r.id,
    name: r.name,
    childIds: Array(r.childCount || 0).fill(0),
    img: r.imageUrl
      ? { uri: fileUrl(r.imageUrl), headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      : roomPlaceholder,
  });

  // Load real rooms (for the picker) and, when editing, the announcement itself.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [roomList, ann] = await Promise.all([
          getRooms(false),
          editing ? getAnnouncement(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setRooms((roomList || []).map(mapRoom));
        if (ann) {
          setName(ann.title || '');
          setDescription(ann.body || '');
          setDate(toDisplayDate(ann.announcementDate));
          setTime(fmtTime(ann.announcementTime));
          setShareWith(ann.scope === 'NURSERY' ? 'nursery' : 'room');
          setRoomId(ann.scope === 'ROOM' ? ann.roomId : null);
          setLinks(ann.links || []);
          setMedia(
            (ann.attachments || []).map((a) => ({
              key: a.id,
              existingId: a.id,
              type: a.type,
              mimeType: a.contentType,
              fileUrl: a.fileUrl,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load the announcement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, id]);

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
    const picked = result.assets.map((a) => ({ key: a.uri, uri: a.uri, name: a.name, mimeType: a.mimeType }));
    setMedia((cur) => [...cur, ...picked]);
  };

  const removeMedia = (key) => setMedia((cur) => cur.filter((m) => m.key !== key));
  const removeLink = (i) => setLinks((cur) => cur.filter((_, idx) => idx !== i));

  const selectedRoom = rooms.find((r) => r.id === roomId);

  // Tap the "Specific Room" card → mark it and open the room picker.
  const onPickSpecificRoom = () => {
    setShareWith('room');
    setShowRoom(true);
  };

  const linksOut = editing ? links : link.trim() ? [link.trim()] : [];
  const scopeApi = shareWith === 'room' ? 'ROOM' : 'NURSERY';

  const valid = editing
    ? name.trim() &&
      date &&
      time &&
      description.trim() &&
      (shareWith === 'nursery' || (shareWith === 'room' && roomId))
    : name.trim() &&
      date &&
      time &&
      description.trim() &&
      media.length > 0 &&
      link.trim() &&
      (shareWith === 'nursery' || (shareWith === 'room' && roomId));

  const buildPayload = () => ({
    title: name.trim(),
    body: description.trim(),
    announcementDate: toISODate(date),
    announcementTime: to24Time(time),
    links: linksOut,
    scope: scopeApi,
    roomId,
    keptMediaIds: media.filter((m) => m.existingId).map((m) => m.existingId),
    newMedia: media
      .filter((m) => !m.existingId)
      .map((m) => ({ uri: m.uri, name: m.name, mimeType: m.mimeType })),
  });

  const publish = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await submitAnnouncementUpdate(id, buildPayload());
      } else {
        await submitAnnouncementCreate({
          title: name.trim(),
          body: description.trim(),
          announcementDate: toISODate(date),
          announcementTime: to24Time(time),
          links: linksOut,
          scope: scopeApi,
          roomId,
          newMedia: media.map((m) => ({ uri: m.uri, name: m.name, mimeType: m.mimeType })),
        });
      }
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not publish the announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-dismiss the success popup and return to the announcements list.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.dismissTo('/announcements'), 1600);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  // Open the preview screen with everything entered so far.
  const preview = () => {
    const isoDate = toISODate(date);
    const whenLabel = isoDate && time ? `${fmtDate(isoDate)} - ${time}` : '';
    const data = {
      id: editing ? id : null,
      editing,
      name: name.trim(),
      description: description.trim(),
      announcementDate: isoDate,
      announcementTime: to24Time(time),
      media,
      links: linksOut,
      shareWith,
      roomId,
      roomName: selectedRoom?.name || null,
      whenLabel,
    };
    router.push({ pathname: '/announcement-preview', params: { data: JSON.stringify(data) } });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

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
            <Text style={styles.uploadHint}>(JPG, PNG, MP4, PDF, Word, Excel)</Text>
          </Pressable>

          {/* Image previews — each with a delete badge to remove & re-upload */}
          {media.some(isImageItem) && (
            <View style={styles.thumbWrap}>
              {media.filter(isImageItem).map((m) => (
                <View key={m.key} style={styles.thumb}>
                  {m.existingId ? (
                    <AuthImage path={m.fileUrl} style={styles.thumbImg} contentFit="cover" />
                  ) : (
                    <Image source={{ uri: m.uri }} style={styles.thumbImg} contentFit="cover" />
                  )}
                  <Pressable style={styles.thumbDelete} onPress={() => removeMedia(m.key)} hitSlop={6}>
                    <Trash width={18} height={18} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Documents / videos — chip with a delete icon */}
          {media.filter((m) => !isImageItem(m)).map((m) => (
            <View key={m.key} style={styles.fileChip}>
              <FileDoc width={24} height={24} />
              <Text style={styles.fileName} numberOfLines={1}>
                {mediaName(m)}
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
          {editing ? (
            links.length > 0 ? (
              links.map((url, i) => (
                <View key={`${url}-${i}`} style={styles.fileChip}>
                  <LinkIcon width={24} height={24} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {url}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => removeLink(i)}>
                    <Trash width={20} height={20} />
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.noLink}>No link attached.</Text>
            )
          ) : (
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
          )}
        </View>

        {/* Share with */}
        <View style={styles.field}>
          <Text style={styles.label}>Share With</Text>
          <View style={styles.shareRow}>
            <Pressable
              style={[styles.shareCard, shareWith === 'nursery' && styles.shareCardOn]}
              onPress={() => {
                setShareWith('nursery');
                setRoomId(null);
              }}
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
          style={[styles.cta, (!valid || submitting) && styles.ctaDisabled]}
          onPress={publish}
          disabled={!valid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.ctaText}>Publish</Text>
          )}
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
        onConfirm={(rid) => {
          setRoomId(rid);
          setShowRoom(false);
        }}
      />

      <SuccessModal
        visible={showSuccess}
        title="Announcement Shared Successfully!"
        message=""
        buttonText=""
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

  content: { padding: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.lg },
  field: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  labelSm: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  noLink: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },

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
