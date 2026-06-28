import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const likeImage = require('../assets/images/success-like.png');

/**
 * Centered success popup overlaid on a dimmed backdrop. Matches the Figma
 * "Success popup" component. Reusable for other success confirmations.
 */
export default function SuccessModal({
  visible,
  onContinue,
  title = 'Account Activated Successfully!',
  message = "You can now access your child's nursery portal.",
  buttonText = 'Continue To App',
  secondaryText,
  onSecondary,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onContinue}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.inner}>
            <Image source={likeImage} style={styles.image} contentFit="contain" />
            <View style={styles.textBlock}>
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          </View>

          {buttonText ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={onContinue}
              >
                <Text style={styles.buttonText}>{buttonText}</Text>
              </Pressable>

              {secondaryText ? (
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.buttonPressed]}
                  onPress={onSecondary}
                >
                  <Text style={styles.secondaryText}>{secondaryText}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
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
    gap: Spacing.md, // 16
  },
  inner: {
    alignItems: 'center',
    gap: Spacing.md, // 16
  },
  image: {
    width: 144,
    height: 144,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.sm + 4, // 12
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
  actions: { width: '100%' },
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  secondaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.gray,
  },
});
