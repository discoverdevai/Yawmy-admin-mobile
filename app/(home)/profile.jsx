import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import User from '../../assets/icons/user.svg';
import Notification from '../../assets/icons/notification.svg';
import Language from '../../assets/icons/language.svg';
import Shield from '../../assets/icons/shield.svg';
import Logout from '../../assets/icons/logout.svg';
import SignOutModal from '../../components/SignOutModal';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatar = require('../../assets/images/avatar-demo.png');

function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8}>
      <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
        <View
          style={[styles.knob, value ? styles.knobOn : styles.knobOff]}
        />
      </View>
    </Pressable>
  );
}

function Row({ Icon, label, right, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Icon width={24} height={24} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {right}
    </Wrapper>
  );
}

const Chevron = () => (
  <ArrowLeft width={24} height={24} style={styles.chevron} />
);

export default function Profile() {
  const router = useRouter();
  const [notify, setNotify] = useState(true);
  const [showSignOut, setShowSignOut] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const confirmSignOut = () => {
    // TODO: clear auth/session when real auth is wired.
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
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <Image source={avatar} style={styles.avatar} contentFit="cover" />
          <View style={styles.profileText}>
            <Text style={styles.name}>Hanna Calzoni</Text>
            <Text style={styles.role}>Nursery Admin</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <Row
            Icon={User}
            label="My Profile"
            right={<Chevron />}
            onPress={() => router.push('/my-profile')}
          />
          <Row
            Icon={Notification}
            label="Notification"
            right={<Toggle value={notify} onChange={setNotify} />}
          />
          <Row
            Icon={Language}
            label="language"
            right={<Text style={styles.langValue}>English</Text>}
          />
          <Row
            Icon={Shield}
            label="Security And Access"
            right={<Chevron />}
            onPress={() => router.push('/security')}
          />

          {/* Sign out (no background) */}
          <Pressable style={styles.signOut} onPress={() => setShowSignOut(true)}>
            <Logout width={24} height={24} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={confirmSignOut}
        title="Do you want to sign out?"
        message="You’ll need to sign in again to access your account."
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

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  profileText: { gap: Spacing.sm },
  name: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
  },
  role: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textBlack },

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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  rowLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },
  chevron: { transform: [{ rotate: '180deg' }] },
  langValue: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.primaryText,
  },

  // Toggle
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleOff: { backgroundColor: Colors.lightGray },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },

  // Sign out
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
  },
  signOutText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.accentText,
  },
});
