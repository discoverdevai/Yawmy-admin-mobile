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
import Calendar from '../../assets/icons/calendar.svg';
import Clock from '../../assets/icons/clock.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import CheckWhite from '../../assets/icons/check-white.svg';
import Trash from '../../assets/icons/trash.svg';
import AuthImage from '../../components/AuthImage';
import DatePickerModal from '../../components/DatePickerModal';
import TimePickerModal from '../../components/TimePickerModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { getEvent, submitEventCreate, submitEventUpdate } from '../../services/eventService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// The two event types offered for now (more can be added later).
const TYPE_OPTIONS = [
  { label: 'Holiday', value: 'HOLIDAY' },
  { label: 'Parent Meeting', value: 'PARENT_TEACHER_MEETING' },
];
const typeLabel = (v) => TYPE_OPTIONS.find((o) => o.value === v)?.label || '';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "30 Mar 2024" -> "2024-03-30"
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
// "2024-03-30" -> "30 Mar 2024"
const toDisplayDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return m ? `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}` : null;
};
// "22:30:00" -> "10:30 PM"
const toDisplayTime = (s) => {
  if (!s) return null;
  const [hh, mm] = s.split(':').map(Number);
  if (Number.isNaN(hh)) return null;
  const period = hh < 12 ? 'AM' : 'PM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
};

export default function AddEvent() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const editing = !!id;

  const [loading, setLoading] = useState(editing);
  const [image, setImage] = useState(null); // { uri, name, mimeType } (new) | { existingUrl } (edit)
  const [name, setName] = useState('');
  const [type, setType] = useState(null); // enum value
  const [typeOpen, setTypeOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null); // "DD MMM YYYY"
  const [time, setTime] = useState(null); // "HH:MM AM/PM"

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load the event when editing.
  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    (async () => {
      try {
        const e = await getEvent(id);
        if (cancelled) return;
        setName(e.title || '');
        setType(e.eventType || null);
        setDescription(e.description || '');
        setDate(toDisplayDate(e.eventDate));
        setTime(toDisplayTime(e.eventTime));
        setImage(e.imageUrl ? { existingUrl: e.imageUrl } : null);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load the event.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/events');
  };

  // Pick a single image.
  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: IMAGE_TYPES,
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const a = result.assets[0];
    setImage({ uri: a.uri, name: a.name, mimeType: a.mimeType });
  };

  const valid = !!image && name.trim() && type && description.trim() && date && time;

  const publish = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        eventType: type,
        title: name.trim(),
        description: description.trim(),
        eventDate: toISODate(date),
        eventTime: to24Time(time),
        image: image?.uri ? image : null,
      };
      if (editing) await submitEventUpdate(id, payload);
      else await submitEventCreate(payload);
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not publish the event.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-dismiss the success popup and return to the events list.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.dismissTo('/events'), 1600);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  // Open the preview screen with everything entered so far.
  const preview = () => {
    const isoDate = toISODate(date);
    const data = {
      id: editing ? id : null,
      editing,
      eventType: type,
      title: name.trim(),
      description: description.trim(),
      eventDate: isoDate,
      eventTime: to24Time(time),
      image,
    };
    router.push({ pathname: '/event-preview', params: { data: JSON.stringify(data) } });
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
        <Text style={styles.headerTitle}>{editing ? 'Edit Event' : 'Add Event'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Event image (one only) */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Image</Text>
          <Pressable style={styles.upload} onPress={pickImage}>
            <Upload width={24} height={24} />
            <Text style={styles.uploadText}>Tap to upload your media</Text>
            <Text style={styles.uploadHint}>(JPG, PNG)</Text>
          </Pressable>

          {!!image && (
            <View style={styles.thumbWrap}>
              <View style={styles.thumb}>
                {image.existingUrl ? (
                  <AuthImage path={image.existingUrl} style={styles.thumbImg} contentFit="cover" />
                ) : (
                  <Image source={{ uri: image.uri }} style={styles.thumbImg} contentFit="cover" />
                )}
                <Pressable style={styles.thumbDelete} onPress={() => setImage(null)} hitSlop={6}>
                  <Trash width={18} height={18} />
                </Pressable>
              </View>
            </View>
          )}
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

        {/* Event type — single-select dropdown (2 options) */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Type</Text>
          <Pressable style={styles.selectBox} onPress={() => setTypeOpen((o) => !o)}>
            <Text style={[styles.selectText, !type && styles.selectPlaceholder]}>
              {type ? typeLabel(type) : 'Select event type'}
            </Text>
            <ChevronDown width={24} height={24} style={typeOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {typeOpen && (
            <View style={styles.dropdown}>
              {TYPE_OPTIONS.map((opt) => {
                const on = type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setType(opt.value);
                      setTypeOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, on && styles.dropdownTextOn]}>{opt.label}</Text>
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
        <Pressable
          style={[styles.cta, (!valid || submitting) && styles.ctaDisabled]}
          onPress={publish}
          disabled={!valid || submitting}
        >
          {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.ctaText}>Publish</Text>}
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
        title="Event Shared Successfully!"
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
