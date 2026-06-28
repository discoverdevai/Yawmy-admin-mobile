import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Upload from '../../assets/icons/upload.svg';
import Calendar from '../../assets/icons/calendar.svg';
import Clock from '../../assets/icons/clock.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import CheckWhite from '../../assets/icons/check-white.svg';
import FileDoc from '../../assets/icons/file-doc.svg';
import Trash from '../../assets/icons/trash.svg';
import DatePickerModal from '../../components/DatePickerModal';
import TimePickerModal from '../../components/TimePickerModal';
import SuccessModal from '../../components/SuccessModal';
import { useEvents } from '../../context/EventsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const EVENT_TYPES = ['Holiday', 'Parent Meeting', 'Activity', 'Celebration', 'Trip'];

// Media the upload accepts: images, mp4 video, pdf and word documents.
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fallbackImage = require('../../assets/images/rooms/sunshine.png');
const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Turn "30 Mar 2024" + "10:30 PM" into the list card's "Mar 30- 10:30 PM".
const toCardDate = (d, t) => {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+\d{4}$/.exec(d || '');
  const datePart = m ? `${m[2]} ${Number(m[1])}` : d;
  return `${datePart}- ${t}`;
};

// Split a card date "Mar 30- 10:30 PM" back into { date: "30 Mar YYYY", time }.
const fromCardDate = (s) => {
  const m = /^([A-Za-z]{3})\s+(\d{1,2})\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))/i.exec(s || '');
  if (!m) return { date: null, time: null };
  const year = new Date().getFullYear();
  return {
    date: `${String(Number(m[2])).padStart(2, '0')} ${m[1]} ${year}`,
    time: m[3].toUpperCase().replace(/\s+/, ' '),
  };
};

// Represent a saved event image as an editable media item.
const buildImageMedia = (image) => {
  if (!image) return [];
  if (typeof image === 'object' && image.uri) {
    return [{ key: 'img-0', name: 'Event image', uri: image.uri, mimeType: 'image/png' }];
  }
  return [{ key: 'img-0', name: 'Event image', source: image, mimeType: 'image/png' }];
};

export default function AddEvent() {
  const router = useRouter();
  const { addEvent, updateEvent, events } = useEvents();
  const { id } = useLocalSearchParams();

  // When an id is supplied we are editing an existing event.
  const editEvent = id ? events.find((e) => e.id === id) : null;
  const editing = !!editEvent;
  const initDateTime = editEvent ? fromCardDate(editEvent.date) : { date: null, time: null };

  const [media, setMedia] = useState(() => (editEvent ? buildImageMedia(editEvent.image) : [])); // [{ key, name, uri?, source?, mimeType }]
  const [name, setName] = useState(editEvent?.title || '');
  const [type, setType] = useState(editEvent?.category || null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [description, setDescription] = useState(editEvent?.desc || '');
  const [date, setDate] = useState(initDateTime.date); // "DD MMM YYYY"
  const [time, setTime] = useState(initDateTime.time); // "HH:MM AM/PM"
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-dismiss the success popup and return to the events list.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.replace('/events'), 2000);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/events');
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

  const valid = media.length > 0 && name.trim() && type && description.trim() && date && time;

  // The banner image value (handles picked URIs and prefilled local requires).
  const bannerImage = () => {
    const first = media.find((m) => (m.mimeType || '').startsWith('image/'));
    if (!first) return fallbackImage;
    return first.uri ? { uri: first.uri } : first.source ?? fallbackImage;
  };

  const publish = () => {
    if (!valid) return;
    const event = {
      category: type,
      title: name.trim(),
      desc: description.trim(),
      location: 'At Nursery',
      date: toCardDate(date, time),
      image: bannerImage(),
    };
    if (editing) updateEvent(id, event);
    else addEvent(event);
    setShowSuccess(true);
  };

  // Open the preview screen with everything entered so far.
  const preview = () => {
    const data = {
      id: editing ? id : null,
      category: type,
      title: name.trim(),
      desc: description.trim(),
      location: 'At Nursery',
      date: date && time ? toCardDate(date, time) : '',
      image: media.length ? bannerImage() : null,
    };
    router.push({ pathname: '/event-preview', params: { data: JSON.stringify(data) } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? 'Edit Event' : 'Add Event'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Event media */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Image</Text>
          <Pressable style={styles.upload} onPress={pickMedia}>
            <Upload width={24} height={24} />
            <Text style={styles.uploadText}>Tap to upload your media</Text>
            <Text style={styles.uploadHint}>(JPG, PNG, MP4, PDF, Word)</Text>
          </Pressable>

          {/* Image previews — each with a delete badge */}
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

        {/* Event name */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter event name"
              placeholderTextColor={Colors.gray}
            />
          </View>
        </View>

        {/* Event type — single-select checkbox dropdown */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Type</Text>
          <Pressable style={styles.selectBox} onPress={() => setTypeOpen((o) => !o)}>
            <Text style={[styles.selectText, !type && styles.selectPlaceholder]}>
              {type || 'Select event type'}
            </Text>
            <ChevronDown width={24} height={24} style={typeOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {typeOpen && (
            <View style={styles.dropdown}>
              {EVENT_TYPES.map((t) => {
                const on = type === t;
                return (
                  <Pressable key={t} style={styles.dropdownItem} onPress={() => setType(t)}>
                    <Text style={[styles.dropdownText, on && styles.dropdownTextOn]}>{t}</Text>
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>
                      {on && <CheckWhite width={14} height={14} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Event description */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Description</Text>
          <View style={styles.textareaBox}>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter event description"
              placeholderTextColor={Colors.gray}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Event date */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Date</Text>
          <Pressable style={styles.selectBox} onPress={() => setShowDate(true)}>
            <Text style={[styles.selectText, !date && styles.selectPlaceholder]}>
              {date || 'Set event date'}
            </Text>
            <Calendar width={24} height={24} />
          </Pressable>
        </View>

        {/* Event time */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Time</Text>
          <Pressable style={styles.selectBox} onPress={() => setShowTime(true)}>
            <Text style={[styles.selectText, !time && styles.selectPlaceholder]}>
              {time || 'Set event time'}
            </Text>
            <Clock width={24} height={24} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={[styles.cta, !valid && styles.ctaDisabled]} onPress={publish} disabled={!valid}>
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

      <SuccessModal
        visible={showSuccess}
        title={editing ? 'Event Updated Successfully!' : 'Event Shared Successfully!'}
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

  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
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
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm + 4,
  },
  dropdownText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  dropdownTextOn: { fontFamily: Fonts.medium, fontWeight: '600', color: Colors.primaryText },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  textareaBox: {
    height: 129,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
  },
  textarea: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

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
