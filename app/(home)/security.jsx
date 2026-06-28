import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Key from '../../assets/icons/key.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Logout from '../../assets/icons/logout.svg';
import SignOutModal from '../../components/SignOutModal';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function Security() {
  const router = useRouter();
  const [showSignOut, setShowSignOut] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const confirmSignOut = () => {
    // TODO: invalidate all sessions on the backend when available.
    setShowSignOut(false);
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.content}>
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

        {/* Options */}
        <View style={styles.menu}>
          <Pressable
            style={styles.row}
            onPress={() => router.push('/change-password')}
          >
            <View style={styles.rowLeft}>
              <Key width={24} height={24} />
              <Text style={styles.rowLabel}>Change Password</Text>
            </View>
            <ChevronDown width={24} height={24} />
          </Pressable>

          <Pressable style={styles.signOutAll} onPress={() => setShowSignOut(true)}>
            <Logout width={24} height={24} />
            <Text style={styles.signOutAllText}>Sign Out From All Devices</Text>
          </Pressable>
        </View>
      </View>

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
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
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
  menu: { gap: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: Colors.primaryBgLight,
    borderRadius: Radii.button,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowLabel: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
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
});
