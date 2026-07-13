import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import RequestLinkModal from '../../components/RequestLinkModal';
import SuccessModal from '../../components/SuccessModal';
import { requestReactivation } from '../../services/authService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const expiredImage = require('../../assets/images/invitation-expired.png');

export default function InvitationExpired() {
  const router = useRouter();
  const [showRequest, setShowRequest] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // After the success popup, head to Sign In.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.replace('/sign-in'), 2500);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  const submitRequest = async (email, message) => {
    setShowRequest(false);
    try {
      // Notifies the super-admin(s) to re-issue an invite. 204 = accepted.
      await requestReactivation(email, message);
    } catch (_) {
      // Non-blocking: we still confirm to the user (the endpoint never leaks
      // whether the email exists), matching the design's optimistic success.
    }
    setShowSuccess(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Centered illustration + copy */}
      <View style={styles.content}>
        <Image source={expiredImage} style={styles.image} contentFit="contain" />
        <View style={styles.textBlock}>
          <Text style={styles.title}>Invitation Expired</Text>
          <Text style={styles.subtitle}>
            This invitation link has expired, Please contact the platform admin to request a new
            invitation.
          </Text>
        </View>
      </View>

      {/* Contact admin */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => setShowRequest(true)}
        >
          <Text style={styles.buttonText}>Contact Admin</Text>
        </Pressable>
      </View>

      <RequestLinkModal
        visible={showRequest}
        onClose={() => setShowRequest(false)}
        onSubmit={submitRequest}
      />

      <SuccessModal
        visible={showSuccess}
        title="We’ve Got Your Request!"
        message="Your request has been sent to the admin. You will receive a new access link shortly. Please check your email for updates."
        buttonText=""
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  image: { width: 343, height: 229 },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.gray,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
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
