import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import ErrorIcon from '../assets/icons/error.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Centered error popup, styled to match the app's design system (same shape
 * and tokens as SuccessModal). Reusable for any error confirmation.
 */
export default function ErrorModal({
  visible,
  onClose,
  title = 'Invalid Credentials',
  message = 'The email or password you entered is incorrect. Please try again.',
  buttonText = 'Try Again',
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.inner}>
            <ErrorIcon width={120} height={120} />
            <View style={styles.textBlock}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </Pressable>
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
  inner: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.sm + 4,
  },
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
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
