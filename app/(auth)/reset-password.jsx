import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import PasswordInput from '../../components/PasswordInput';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { resetPassword } from '../../services/authService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const hero = require('../../assets/images/secure-password.png');

const MIN_LENGTH = 8;

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;
  const navTimer = useRef(null);

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  useEffect(() => () => clearTimeout(navTimer.current), []);

  const showMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= MIN_LENGTH && password === confirm && !submitting;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/sign-in');
  };

  const handleBackToSignIn = () => {
    clearTimeout(navTimer.current);
    setShowSuccess(false);
    router.replace('/sign-in');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // POST /auth/reset-password { token, newPassword } → 204
      await resetPassword(token, password);
      setShowSuccess(true);
      // Auto-navigate to Sign In after showing the success alert.
      navTimer.current = setTimeout(handleBackToSignIn, 1800);
    } catch (e) {
      setError(e.message || 'Could not reset your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <Animated.View style={[styles.flex, { transform: [{ translateY: shift }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Set Password</Text>
        </View>

        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroBlock}>
              <Image source={hero} style={styles.heroImage} contentFit="contain" />
              <Text style={styles.subtitle}>
                Create a secure password to access your account.
              </Text>
            </View>

            <View style={styles.inputs}>
              <PasswordInput
                label="Password"
                value={password}
                onChangeText={setPassword}
              />
              <PasswordInput
                label="Confirm Password"
                value={confirm}
                onChangeText={setConfirm}
              />
              {showMismatch && (
                <Text style={styles.error}>Passwords do not match.</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.buttonText}>Set Password</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <SuccessModal
        visible={showSuccess}
        onContinue={handleBackToSignIn}
        title="Password Reset Successful"
        message="Your password has been updated. You can now sign in with your new password."
        buttonText="Back to Sign In"
      />

      <ErrorModal
        visible={!!error}
        onClose={() => setError(null)}
        title="Reset failed"
        message={error}
        buttonText="Try Again"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  heroBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroImage: {
    width: '100%',
    maxWidth: 327,
    aspectRatio: 1,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  inputs: {
    gap: Spacing.lg,
  },
  error: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.error,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.disabledButton,
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
});
