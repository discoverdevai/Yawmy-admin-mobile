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
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Upload from '../assets/icons/upload.svg';
import ChevronDown from '../assets/icons/chevron-down.svg';
import Check from '../assets/icons/check.svg';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useRooms } from '../context/RoomsContext';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

export default function AddRoomModal({ visible, onClose, onAdd }) {
  const { enrolledTeachers } = useRooms();
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  const canSubmit = name.trim().length > 0;

  const reset = () => {
    setImage(null);
    setName('');
    setTeachers([]);
    setTeacherOpen(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload a room image.');
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
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const toggleTeacher = (t) =>
    setTeachers((list) =>
      list.includes(t) ? list.filter((x) => x !== t) : [...list, t]
    );

  const handleAdd = () => {
    if (!canSubmit) return;
    onAdd({ name: name.trim(), image, teachers });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const teacherSummary = teachers.length ? teachers.join(', ') : 'Select teacher(s)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: shift }] }]}>
          <SafeAreaView edges={['bottom']}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>Add Room</Text>

              {/* Room image */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Room Image</Text>
                <Pressable style={styles.uploadBox} onPress={pickImage}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.preview} contentFit="cover" />
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

              {/* Assign teachers */}
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
                    <ChevronDown
                      width={24}
                      height={24}
                      style={teacherOpen ? styles.chevronUp : undefined}
                    />
                  </View>
                </Pressable>

                {teacherOpen && (
                  <View style={styles.dropdownPanel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {enrolledTeachers.map((t) => {
                        const selected = teachers.includes(t);
                        return (
                          <Pressable key={t} style={styles.teacherRow} onPress={() => toggleTeacher(t)}>
                            <Text style={styles.teacherName}>{t}</Text>
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
                  styles.addBtn,
                  !canSubmit && styles.addBtnDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
                onPress={handleAdd}
                disabled={!canSubmit}
              >
                <Text style={styles.addBtnText}>Add Room</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '90%',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
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
  teacherRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teacherName: {
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
  addBtnText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
