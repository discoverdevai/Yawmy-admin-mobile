import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Key from '../../assets/icons/key.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Logout from '../../assets/icons/logout.svg';
import PasswordInput from '../../components/PasswordInput';
import ErrorModal from '../../components/ErrorModal';
import SignOutModal from '../../components/SignOutModal';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { DUMMY_USER, setUserPassword } from '../../constants/dummyUser';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const likeImage = require('../../assets/images/success-like.png');

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const navTimer = useRef(null);
  const scrollRef = useRef(null);
  const fieldRefs = useRef([]);
  const scrollY = useRef(0);
  const [focusedIndex, setFocusedIndex] = useState(null);

  useEffect(() => () => clearTimeout(navTimer.current), []);

  // When the keyboard opens, scroll the focused field above it (if it would
  // be covered). Uses measure() so it works on the New Architecture.
  useEffect(() => {
    if (focusedIndex == null || keyboardHeight === 0) return;
    const field = fieldRefs.current[focusedIndex];
    if (!field?.measure) return;
    field.measure((x, y, w, h, pageX, pageY) => {
      const keyboardTop = Dimensions.get('window').height - keyboardHeight;
      const overlap = pageY + h - (keyboardTop - 16);
      if (overlap > 0) {
        scrollRef.current?.scrollTo({
          y: scrollY.current + overlap,
          animated: true,
        });
      }
    });
  }, [focusedIndex, keyboardHeight]);

  const showMismatch = confirm.length > 0 && newPass !== confirm;
  const canSubmit =
    current.length > 0 && newPass.length >= MIN_LENGTH && newPass === confirm;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/security');
  };

  const handleChange = () => {
    if (!canSubmit) return;
    if (current !== DUMMY_USER.password) {
      setShowWrong(true); // failed: wrong current password
      return;
    }
    // Correct → save the new password, show success, auto-return.
    setUserPassword(newPass);
    setShowSuccess(true);
    navTimer.current = setTimeout(() => {
      setShowSuccess(false);
      goBack();
    }, 1800);
  };

  const handleWrongClose = () => {
    setShowWrong(false);
    setCurrent('');
  };

  const confirmSignOut = () => {
    // TODO: invalidate all sessions on the backend when available.
    setShowSignOut(false);
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.flex}>
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
          <Text style={styles.headerTitle}>Security And Access</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Spacing.lg + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
        >
          {/* Change password card */}
          <View style={styles.card}>
            <Pressable
              style={styles.cardHeader}
              onPress={() => setExpanded((e) => !e)}
            >
              <View style={styles.cardHeaderLeft}>
                <Key width={24} height={24} />
                <Text style={styles.cardTitle}>Change Password</Text>
              </View>
              <ChevronDown
                width={24}
                height={24}
                style={expanded ? styles.chevronUp : undefined}
              />
            </Pressable>

            {expanded && (
              <View style={styles.body}>
                <View style={styles.fields}>
                  <View ref={(el) => (fieldRefs.current[0] = el)} collapsable={false}>
                    <PasswordInput
                      label="Current Password"
                      placeholder="Enter your current password"
                      value={current}
                      onChangeText={setCurrent}
                      onFocus={() => setFocusedIndex(0)}
                    />
                  </View>
                  <View ref={(el) => (fieldRefs.current[1] = el)} collapsable={false}>
                    <PasswordInput
                      label="New Password"
                      placeholder="Enter your new password"
                      value={newPass}
                      onChangeText={setNewPass}
                      onFocus={() => setFocusedIndex(1)}
                    />
                  </View>
                  <View ref={(el) => (fieldRefs.current[2] = el)} collapsable={false}>
                    <PasswordInput
                      label="Confirm New Password"
                      placeholder="Enter your new password"
                      value={confirm}
                      onChangeText={setConfirm}
                      onFocus={() => setFocusedIndex(2)}
                    />
                  </View>
                  {showMismatch && (
                    <Text style={styles.error}>Passwords do not match.</Text>
                  )}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.changeBtn,
                    !canSubmit && styles.changeBtnDisabled,
                    pressed && canSubmit && styles.pressed,
                  ]}
                  onPress={handleChange}
                  disabled={!canSubmit}
                >
                  <Text style={styles.changeBtnText}>Change Password</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Sign out from all devices */}
          <Pressable style={styles.signOutAll} onPress={() => setShowSignOut(true)}>
            <Logout width={24} height={24} />
            <Text style={styles.signOutAllText}>Sign Out From All Devices</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Success popup (no button — auto-dismisses) */}
      <Modal visible={showSuccess} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Image source={likeImage} style={styles.successImage} contentFit="contain" />
            <Text style={styles.successTitle}>Password Changed Successfully!</Text>
          </View>
        </View>
      </Modal>

      <ErrorModal
        visible={showWrong}
        onClose={handleWrongClose}
        title="Failed to Set Password"
        message="Your current password is incorrect. Please try again."
        buttonText="Try Again"
      />

      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={confirmSignOut}
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
    gap: Spacing.sm + 4,
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
    gap: Spacing.md,
  },

  card: {
    backgroundColor: Colors.primaryBgLight,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  body: { gap: Spacing.md },
  fields: { gap: Spacing.md },
  error: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.error,
  },
  changeBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtnDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  changeBtnText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },

  signOutAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: Colors.accentBgLight,
    borderRadius: Radii.button,
  },
  signOutAllText: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.accentText,
  },

  // Success popup
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  successCard: {
    width: '100%',
    maxWidth: 343,
    backgroundColor: Colors.background,
    borderRadius: Radii.button,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.md,
  },
  successImage: { width: 144, height: 144 },
  successTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
    textAlign: 'center',
  },
});

