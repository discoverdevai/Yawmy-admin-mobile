import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const binImage = require('../assets/images/delete-session.png');

/**
 * Confirmation popup for deleting a schedule session (Figma 603-16423).
 */
export default function DeleteSessionModal({ visible, onCancel, onConfirm }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.inner}>
            <Image source={binImage} style={styles.image} contentFit="contain" />
            <View style={styles.textBlock}>
              <Text style={styles.title}>Delete This Session ?</Text>
              <Text style={styles.message}>
                Are you sure you want to delete this session? This action cannot be undone.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 343,
    backgroundColor: Colors.background,
    borderRadius: 36,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  inner: { alignItems: 'center', gap: Spacing.md },
  image: { width: 144, height: 144 },
  textBlock: { width: '100%', alignItems: 'center', gap: Spacing.sm + 4 },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  message: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm + 4 },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.redText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.gray,
  },
  pressed: { opacity: 0.85 },
});
