import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import MuteArt from '../assets/icons/mute-illustration.svg';
import UnmuteArt from '../assets/icons/unmute-illustration.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Confirm muting / unmuting a user (Figma 598-115304 / 848-27729).
 * `muted=false` → "Mute User?"; `muted=true` → "Unmute User?".
 */
export default function MuteUserModal({ visible, muted = false, onCancel, onConfirm }) {
  const Art = muted ? UnmuteArt : MuteArt;
  const title = muted ? 'Unmute User?' : 'Mute User?';
  const message = muted
    ? 'Are you sure you want to unmute this user? They will be able to send messages in this chat.'
    : 'Are you sure you want to mute this user? They will no longer be able to send messages in this chat.';
  const confirmLabel = muted ? 'Unmute' : 'Mute';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.inner}>
            <Art width={144} height={144} />
            <View style={styles.textBlock}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  textBlock: { width: '100%', alignItems: 'center', gap: Spacing.sm + 4 },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack, textAlign: 'center' },
  message: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm + 4 },
  cancelBtn: { flex: 1, height: 48, borderRadius: Radii.button, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.gray },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
  pressed: { opacity: 0.85 },
});
