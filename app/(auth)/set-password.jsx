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
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useAuth } from '../../context/AuthContext';
import { acceptInvite } from '../../services/authService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const hero = require('../../assets/images/secure-password.png');

const MIN_LENGTH = 8;

export default function SetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { activateSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  // Push the whole screen up by the keyboard height, restore on close.
  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  // Live validation
  const showMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= MIN_LENGTH && password === confirm && !submitting;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/invitation');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!token) {
      setError('Missing invitation token. Please reopen the invite link.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // Complete the invite: set password + activate the account.
      const res = await acceptInvite(token, password);
      // Log the new admin in so the nursery-setup steps are authenticated.
      await activateSession(res.accessToken, res.refreshToken);
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not set your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToApp = () => {
    setShowSuccess(false);
    router.replace('/nursery-info');
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
            {/* Illustration + subtitle */}
            <View style={styles.heroBlock}>
              <Image source={hero} style={styles.heroImage} contentFit="contain" />
              <Text style={styles.subtitle}>
                Create a secure password to access your account.
              </Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputs}>
              <PasswordInput
                label="Password"
                value={password}
                onChangeText={setPassword}
              />
              <Text
                style={[styles.hint, password.length > 0 && password.length < MIN_LENGTH && styles.error]}
              >
                Password must be at least {MIN_LENGTH} characters.
              </Text>
              <PasswordInput
                label="Confirm Password"
                value={confirm}
                onChangeText={setConfirm}
              />
              {showMismatch && (
                <Text style={styles.error}>Passwords do not match.</Text>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </ScrollView>

          {/* Footer button */}
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
              <Text
                style={[styles.buttonText, !canSubmit && styles.buttonTextDisabled]}
              >
                Set Password
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <SuccessModal
        visible={showSuccess}
        onContinue={handleContinueToApp}
        message="You can now access your nursery's Admin portal."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    gap: Spacing.lg, // 24 between hero block and inputs
  },
  heroBlock: {
    alignItems: 'center',
    gap: Spacing.xs, // 4
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
    gap: Spacing.lg, // 24 between the two fields
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.gray,
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
  buttonTextDisabled: {
    color: Colors.white,
  },
});
