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
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useRooms } from '../context/RoomsContext';
import { CHILDREN } from '../constants/people';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

export default function EditRoomModal({ visible, onClose, room }) {
  const { updateRoom, enrolledTeachers } = useRooms();
  const [name, setName] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [childIds, setChildIds] = useState([]);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  // Pre-fill from the room every time the sheet opens.
  useEffect(() => {
    if (visible && room) {
      setName(room.name);
      setTeachers(room.teachers || []);
      setChildIds(room.childIds || []);
      setTeacherOpen(false);
      setChildOpen(false);
    }
  }, [visible, room]);

  const canSubmit = name.trim().length > 0;

  const toggleTeacher = (t) =>
    setTeachers((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  const toggleChild = (id) =>
    setChildIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const handleSave = () => {
    if (!canSubmit || !room) return;
    updateRoom(room.id, { name: name.trim(), teachers, childIds });
    onClose();
  };

  const teacherSummary = teachers.length ? teachers.join(', ') : 'Select teacher(s)';
  const childSummary = childIds.length
    ? `${childIds.length} child${childIds.length > 1 ? 'ren' : ''} selected`
    : 'Select children';

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
              <Text style={styles.title}>Edit Room</Text>

              {/* Room name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Room Name</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter room name"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
              </View>

              {/* Teachers */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Assign Teacher(s)</Text>
                <Pressable
                  style={[styles.inputBox, teacherOpen && styles.inputBoxOpen]}
                  onPress={() => setTeacherOpen((o) => !o)}
                >
                  <View style={styles.dropdownRow}>
                    <Text
                      style={[styles.placeholder, teachers.length > 0 && styles.filled]}
                      numberOfLines={1}
                    >
                      {teacherSummary}
                    </Text>
                    <ChevronDown width={24} height={24} style={teacherOpen ? styles.chevronUp : undefined} />
                  </View>
                </Pressable>
                {teacherOpen && (
                  <View style={styles.dropdownPanel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {enrolledTeachers.map((t) => {
                        const selected = teachers.includes(t);
                        return (
                          <Pressable key={t} style={styles.optionRow} onPress={() => toggleTeacher(t)}>
                            <Text style={styles.optionName}>{t}</Text>
                            <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                              {selected && <Check width={16} height={16} />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Children */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Assign Children</Text>
                <Pressable
                  style={[styles.inputBox, childOpen && styles.inputBoxOpen]}
                  onPress={() => setChildOpen((o) => !o)}
                >
                  <View style={styles.dropdownRow}>
                    <Text
                      style={[styles.placeholder, childIds.length > 0 && styles.filled]}
                      numberOfLines={1}
                    >
                      {childSummary}
                    </Text>
                    <ChevronDown width={24} height={24} style={childOpen ? styles.chevronUp : undefined} />
                  </View>
                </Pressable>
                {childOpen && (
                  <View style={styles.dropdownPanel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {CHILDREN.map((c) => {
                        const selected = childIds.includes(c.id);
                        return (
                          <Pressable key={c.id} style={styles.optionRow} onPress={() => toggleChild(c.id)}>
                            <Text style={styles.optionName}>{c.name}</Text>
                            <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                              {selected && <Check width={16} height={16} />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  !canSubmit && styles.saveBtnDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
                onPress={handleSave}
                disabled={!canSubmit}
              >
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '90%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    justifyContent: 'center',
  },
  inputBoxOpen: {
    backgroundColor: Colors.tapsBg,
    borderColor: Colors.primary,
  },
  input: {
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  placeholder: {
    flexShrink: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.gray,
  },
  filled: { color: Colors.textBlack },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdownPanel: {
    height: 138,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: Colors.primary },
  saveBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
