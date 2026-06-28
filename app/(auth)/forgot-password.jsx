import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Sms from '../../assets/icons/sms.svg';
import ErrorOutline from '../../assets/icons/error-outline.svg';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { isRegisteredEmail } from '../../constants/dummyUser';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const illustration = require('../../assets/images/forgot-password.png');

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showEmailError = email.trim().length > 0 && !isValidEmail;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/sign-in');
  };

  const handleSend = () => {
    if (!isValidEmail) return;
    // TODO: replace with a real "send reset code" API call.
    if (isRegisteredEmail(email)) {
      router.push('/verify-code');
    } else {
      setNotRegistered(true);
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
          <Text style={styles.headerTitle}>Forget Password</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Illustration + subtitle */}
          <View style={styles.illoBlock}>
            <Image source={illustration} style={styles.illo} contentFit="contain" />
            <Text style={styles.subtitle}>
              Use your registered email and we’ll send you a verification code to
              reset your password.
            </Text>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputBox, notRegistered && styles.inputBoxError]}>
              <Sms width={24} height={24} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (notRegistered) setNotRegistered(false);
                }}
                placeholder="Enter your Email"
                placeholderTextColor={Colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>
            {showEmailError && (
              <Text style={styles.error}>Please enter a valid email address.</Text>
            )}
            {notRegistered && (
              <View style={styles.errorRow}>
                <ErrorOutline width={24} height={24} />
                <Text style={styles.errorRed}>This email is not registered</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              !isValidEmail && styles.buttonDisabled,
              pressed && isValidEmail && styles.buttonPressed,
            ]}
            onPress={handleSend}
            disabled={!isValidEmail}
          >
            <Text style={styles.buttonText}>Send</Text>
          </Pressable>
        </View>
      </Animated.View>
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
    gap: Spacing.lg, // 24
  },
  illoBlock: { alignItems: 'center' },
  illo: {
    width: '100%',
    maxWidth: 343,
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
  fieldGroup: { gap: Spacing.sm + 4 },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  error: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.error,
  },
  inputBoxError: {
    backgroundColor: Colors.lightRedBg,
    borderColor: Colors.redText,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorRed: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.redText,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  button: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: Colors.disabledButton },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
