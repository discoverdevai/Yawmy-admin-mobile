import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronDown from '../assets/icons/chevron-down.svg';
import Check from '../assets/icons/check.svg';
import TimePickerModal from './TimePickerModal';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { getTeachers } from '../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

export default function AddSessionModal({ visible, onClose, onAdd, session, submitting }) {
  const isEdit = !!session;
  const [name, setName] = useState('');
  const [teacherList, setTeacherList] = useState([]); // [{ id, fullName }]
  const [teacherId, setTeacherId] = useState(null); // exactly one teacher
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [open, setOpen] = useState(null); // 'teacher' | null
  const [picker, setPicker] = useState(null); // 'from' | 'to' | null
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  // Load the real teachers whenever the sheet opens.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    getTeachers()
      .then((list) => alive && setTeacherList(Array.isArray(list) ? list : []))
      .catch(() => alive && setTeacherList([]));
    return () => {
      alive = false;
    };
  }, [visible]);

  // On open, prefill from the session being edited (or start empty).
  useEffect(() => {
    if (visible) {
      setName(session?.name || '');
      setTeacherId(session?.teacherId || null);
      setFrom(session?.from || null);
      setTo(session?.to || null);
      setOpen(null);
      setPicker(null);
    }
  }, [visible, session]);

  const canSubmit = name.trim() && teacherId && from && to && !submitting;

  const handleAdd = () => {
    if (!canSubmit) return;
    onAdd({ name: name.trim(), teacherId, from, to });
  };

  const toggle = (field) => setOpen((o) => (o === field ? null : field));
  const selectTeacher = (id) => {
    setTeacherId(id);
    setOpen(null);
  };
  const teacherName = teacherList.find((t) => t.id === teacherId)?.fullName;

  const confirmTime = (value) => {
    if (picker === 'from') setFrom(value);
    else if (picker === 'to') setTo(value);
    setPicker(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: shift }] }]}>
          <SafeAreaView edges={['bottom']}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>{isEdit ? 'Edit Session' : 'Add Session'}</Text>

              {/* Session name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Session Name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter session name"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
              </View>

              {/* Teacher — multi-select, at least one required */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Teacher</Text>
                <Pressable
                  style={[styles.inputBox, open === 'teacher' && styles.inputBoxOpen]}
                  onPress={() => toggle('teacher')}
                >
                  <View style={styles.dropdownRow}>
                    <Text
                      style={[styles.placeholder, teacherId && styles.filled]}
                      numberOfLines={1}
                    >
                      {teacherName || 'Select teacher'}
                    </Text>
                    <ChevronDown
                      width={24}
                      height={24}
                      style={open === 'teacher' ? styles.up : undefined}
                    />
                  </View>
                </Pressable>
                {open === 'teacher' && (
                  <View style={styles.panel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {teacherList.length === 0 ? (
                        <Text style={styles.emptyOption}>No teachers available yet.</Text>
                      ) : (
                        teacherList.map((t) => {
                          const selected = teacherId === t.id;
                          return (
                            <Pressable
                              key={t.id}
                              style={styles.optionRow}
                              onPress={() => selectTeacher(t.id)}
                            >
                              <Text style={styles.optionName}>{t.fullName}</Text>
                              <View style={[styles.radio, selected && styles.radioOn]}>
                                {selected && <View style={styles.radioDot} />}
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Time */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Time</Text>
                <View style={styles.timeRow}>
                  <Pressable style={styles.timeBox} onPress={() => setPicker('from')}>
                    <Text style={[styles.timeText, from && styles.filled]} numberOfLines={1}>
                      From: {from || '00:00 AM'}
                    </Text>
                    <ChevronDown width={20} height={20} />
                  </Pressable>

                  <Pressable style={styles.timeBox} onPress={() => setPicker('to')}>
                    <Text style={[styles.timeText, to && styles.filled]} numberOfLines={1}>
                      To: {to || '00:00 PM'}
                    </Text>
                    <ChevronDown width={20} height={20} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  !canSubmit && styles.addBtnDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
                onPress={handleAdd}
                disabled={!canSubmit}
              >
                <Text style={styles.addBtnText}>
                  {submitting ? 'Saving…' : isEdit ? 'Edit Session' : 'Add Session'}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>

        <TimePickerModal
          visible={!!picker}
          initial={picker === 'from' ? from : to}
          onCancel={() => setPicker(null)}
          onConfirm={confirmTime}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '90%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    justifyContent: 'center',
  },
  inputBoxOpen: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  input: { padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  placeholder: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },
  filled: { color: Colors.textBlack },
  up: { transform: [{ rotate: '180deg' }] },
  panel: {
    maxHeight: 168,
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
  optionName: { flexShrink: 1, fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  emptyOption: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  timeRow: { flexDirection: 'row', gap: Spacing.sm },
  timeBox: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  timeText: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },

  addBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  addBtnDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  addBtnText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
