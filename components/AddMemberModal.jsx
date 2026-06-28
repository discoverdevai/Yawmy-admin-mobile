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
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_HINT = 'Use a valid email like name@example.com';

const DEFAULT_ROLES = [
  'Lead Teacher',
  'Assistant Teacher',
  'Classroom Teacher',
  'Subject Teacher',
  'Nursery Supervisor',
  'Trainee Teacher',
];

/**
 * Bottom-sheet form to add a new staff member (Figma 598-112412).
 * Image is optional; name, a valid email and a role are required.
 */
export default function AddMemberModal({
  visible,
  title = 'Add Teacher',
  nameLabel = 'Teacher Name',
  namePlaceholder = 'Enter teacher name',
  emailPlaceholder = 'Enter teacher email',
  roles = DEFAULT_ROLES,
  onClose,
  onAdd,
}) {
  const [image, setImage] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [errors, setErrors] = useState({}); // { name, email, role }

  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  const reset = () => {
    setImage(null);
    setName('');
    setEmail('');
    setRole('');
    setRoleOpen(false);
    setErrors({});
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload an image.');
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

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Name is required.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(email.trim())) next.email = EMAIL_HINT;
    if (!role) next.role = 'Please select a role.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    onAdd({
      name: name.trim(),
      email: email.trim(),
      role,
      avatar: image ? { uri: image } : null,
      status: 'pending', // invited, awaiting sign-up
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Live-clear an error once the field becomes valid again.
  const onNameChange = (t) => {
    setName(t);
    if (errors.name && t.trim()) setErrors((e) => ({ ...e, name: undefined }));
  };
  const onEmailChange = (t) => {
    setEmail(t);
    if (errors.email && EMAIL_RE.test(t.trim())) setErrors((e) => ({ ...e, email: undefined }));
  };

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
              <Text style={styles.title}>{title}</Text>

              {/* Image (optional) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Image</Text>
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

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{nameLabel}</Text>
                <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={onNameChange}
                    placeholder={namePlaceholder}
                    placeholderTextColor={Colors.gray}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={onEmailChange}
                    placeholder={emailPlaceholder}
                    placeholderTextColor={Colors.gray}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Role */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Role</Text>
                <Pressable
                  style={[
                    styles.inputBox,
                    roleOpen && styles.inputBoxOpen,
                    errors.role && styles.inputBoxError,
                  ]}
                  onPress={() => setRoleOpen((o) => !o)}
                >
                  <View style={styles.dropdownRow}>
                    <Text style={[styles.placeholder, role && styles.filled]} numberOfLines={1}>
                      {role || 'Select role'}
                    </Text>
                    <ChevronDown
                      width={24}
                      height={24}
                      style={roleOpen ? styles.chevronUp : undefined}
                    />
                  </View>
                </Pressable>
                {roleOpen && (
                  <View style={styles.dropdownPanel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {roles.map((r) => {
                        const on = role === r;
                        return (
                          <Pressable
                            key={r}
                            style={styles.optionRow}
                            onPress={() => {
                              setRole(r);
                              setRoleOpen(false);
                              setErrors((e) => ({ ...e, role: undefined }));
                            }}
                          >
                            <Text style={styles.optionName}>{r}</Text>
                            <View style={[styles.checkbox, on && styles.checkboxOn]}>
                              {on && <Check width={16} height={16} />}
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
              </View>

              <Pressable
                style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                onPress={handleAdd}
              >
                <Text style={styles.addBtnText}>Add And Sent Invitation</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
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
  inputBoxOpen: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  inputBoxError: { borderColor: Colors.redText, backgroundColor: Colors.lightRedBg },
  input: { padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  errorText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.redText },

  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  placeholder: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },
  filled: { color: Colors.textBlack },
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
  pressed: { opacity: 0.85 },
  addBtnText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
