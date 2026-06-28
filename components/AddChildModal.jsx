import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Bottom-sheet for adding a child to a room by name (Figma 598-110332 —
 * just the sheet; the screen behind it is ignored).
 */
export default function AddChildModal({
  visible,
  onClose,
  onAdd,
  title = 'Add Child',
  label = 'Child Name',
  placeholder = 'Enter child name',
  buttonText = 'Add Child',
}) {
  const [name, setName] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  useEffect(() => {
    if (!visible) setName('');
  }, [visible]);

  const canSubmit = name.trim().length > 0;

  const handleAdd = () => {
    if (!canSubmit) return;
    onAdd(name.trim());
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
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                  />
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
                <Text style={styles.addBtnText}>{buttonText}</Text>
              </Pressable>
            </View>
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
  input: {
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  addBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
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
