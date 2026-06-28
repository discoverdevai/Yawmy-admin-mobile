import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const archiveImage = require('../assets/images/archive-illustration.png');

/**
 * Confirmation popup for archiving a room (Figma 598-107877). Centered over a
 * dimmed backdrop so the Rooms screen shows behind it.
 */
export default function ArchiveRoomModal({ visible, onCancel, onConfirm, roomName }) {
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
            <Image source={archiveImage} style={styles.image} contentFit="contain" />
            <View style={styles.textBlock}>
              <Text style={styles.title}>Archive Room?</Text>
              <Text style={styles.message}>
                {roomName ? `“${roomName}” ` : 'This room '}will be archived and removed from
                active rooms. You can restore it later if needed.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>Archive Room</Text>
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm + 4,
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
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  pressed: { opacity: 0.85 },
});
