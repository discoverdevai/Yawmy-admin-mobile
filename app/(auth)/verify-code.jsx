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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import ErrorModal from '../../components/ErrorModal';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { verifyResetOtp, resendResetOtp } from '../../services/authService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const illustration = require('../../assets/images/otp.png');

export default function VerifyCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const otpSeconds = Number(params.expiresInSeconds) || 30;
  const [token, setToken] = useState(params.token);
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showWrong, setShowWrong] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(otpSeconds);
  const inputs = useRef([]);
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  // Resend countdown
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const code = digits.join('');
  const complete = code.length === 4;

  const handleChange = (text, i) => {
    const val = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (error) setError(false);
    if (val && i < 3) inputs.current[i + 1]?.focus();
  };

  const handleKeyPress = (e, i) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    try {
      // POST /auth/resend-reset-otp → new OTP emailed, fresh countdown.
      const res = await resendResetOtp(token);
      if (res?.token) setToken(res.token);
      setSeconds(Number(res?.expiresInSeconds) || otpSeconds);
    } catch (_) {
      setSeconds(otpSeconds);
    }
    setDigits(['', '', '', '']);
    setError(false);
    inputs.current[0]?.focus();
  };

  const handleVerify = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    try {
      // POST /auth/verify-reset-otp → 204 on success.
      await verifyResetOtp(token, code);
      router.replace({ pathname: '/reset-password', params: { token } });
    } catch (e) {
      setError(true); // red borders
      setErrorMsg(e.message || 'The verification code you entered is incorrect.');
      setShowWrong(true); // wrong-pin modal
    } finally {
      setSubmitting(false);
    }
  };

  const handleTryAgain = () => {
    setShowWrong(false);
    setError(false);
    setDigits(['', '', '', '']); // clear the old pin
    inputs.current[0]?.focus();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/forgot-password');
  };

  const timer = `00:${String(seconds).padStart(2, '0')}`;

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
          <Text style={styles.headerTitle}>Enter Verification Code</Text>
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
              We’ve sent a 4-digit code to your email. Please enter it below.
            </Text>
          </View>

          {/* OTP boxes */}
          <View style={styles.otpBlock}>
            <View style={styles.boxesRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  style={[
                    styles.box,
                    d !== '' && styles.boxFilled,
                    error && styles.boxError,
                  ]}
                  value={d}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  autoFocus={i === 0}
                />
              ))}
            </View>

            <View style={styles.resendBlock}>
              <Text style={styles.resendQuestion}>Didn’t receive the code?</Text>
              <Text style={styles.resendLine}>
                <Text
                  style={styles.resendLink}
                  onPress={seconds === 0 ? handleResend : undefined}
                >
                  Resend code
                </Text>
                {seconds > 0 ? <Text>{` in ${timer}`}</Text> : null}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.button, !complete && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={!complete}
          >
            <Text style={styles.buttonText}>Verify Code</Text>
          </Pressable>
        </View>
      </Animated.View>

      <ErrorModal
        visible={showWrong}
        onClose={handleTryAgain}
        title="Wrong PIN"
        message={errorMsg || 'The verification code you entered is incorrect. Please try again.'}
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
    gap: Spacing.xl, // 32
  },
  illoBlock: { alignItems: 'center', gap: Spacing.xs },
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

  otpBlock: { alignItems: 'center', gap: Spacing.md },
  boxesRow: { flexDirection: 'row', gap: Spacing.md },
  box: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 20,
    color: Colors.textBlack,
  },
  boxFilled: {
    backgroundColor: Colors.lightGreen,
    borderColor: Colors.primary,
  },
  boxError: {
    borderColor: Colors.redText,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.redText,
  },
  resendBlock: { alignItems: 'center', gap: Spacing.sm },
  resendQuestion: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.textBlack,
  },
  resendLine: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  resendLink: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    color: Colors.primaryText,
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
  buttonDisabled: { opacity: 0.4 },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
