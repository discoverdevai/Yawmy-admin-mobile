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
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePlaceholder from '../../assets/icons/image-placeholder.svg';
import Sms from '../../assets/icons/sms.svg';
import PasswordInput from '../../components/PasswordInput';
import ErrorModal from '../../components/ErrorModal';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useAuth } from '../../context/AuthContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
  const canSubmit = isValidEmail && password.length > 0 && !submitting;

  const handleSignIn = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await signIn(email.trim(), password); // POST /auth/login → session
      router.replace('/home');
    } catch (e) {
      setError(e.message || 'The email or password you entered is incorrect.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = () => {
    router.push('/forgot-password');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <Animated.View style={[styles.flex, { transform: [{ translateY: shift }] }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>
              Welcome back — let’s make today fun and productive.
            </Text>
          </View>

          {/* Logo placeholder */}
          <View style={styles.card}>
            <ImagePlaceholder width={163} height={163} />
          </View>

          {/* Inputs */}
          <View style={styles.inputs}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputBox}>
                <Sms width={24} height={24} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your Email"
                  placeholderTextColor={Colors.gray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
              </View>
              {showEmailError && (
                <Text style={styles.error}>
                  Please enter a valid email address.
                </Text>
              )}
            </View>

            <View style={styles.passwordBlock}>
              <PasswordInput
                label="Password"
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={handleForgot} hitSlop={8}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
            onPress={handleSignIn}
            disabled={!canSubmit}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
        </View>
      </Animated.View>

      <ErrorModal
        visible={!!error}
        onClose={() => setError(null)}
        message={error}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg, // 24
  },

  titleBlock: { alignItems: 'center', gap: Spacing.md },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textBlack,
    textAlign: 'center',
  },

  card: {
    width: '100%',
    height: 308,
    backgroundColor: Colors.placeholder,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputs: { gap: Spacing.md }, // 16
  fieldGroup: { gap: Spacing.sm + 4 }, // 12
  passwordBlock: { gap: Spacing.sm + 4, alignItems: 'flex-end' },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
    alignSelf: 'flex-start',
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
  forgot: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.primary,
  },
  error: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.error,
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
