import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const decor = require('../../assets/images/profile-decor.png');

const FIELDS = [
  { label: 'Teacher Name', value: 'Hanna Calzoni' },
  { label: 'Email', value: 'hanna.calzoni@gmail.com' },
  { label: 'Role', value: 'Nursery Admin' },
];

export default function MyProfile() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <Image
        source={decor}
        style={styles.decor}
        contentFit="contain"
        pointerEvents="none"
      />

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
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        {/* Read-only fields */}
        <View style={styles.fields}>
          {FIELDS.map((f) => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={styles.label}>{f.label}</Text>
              <View style={styles.fieldBox}>
                <Text style={styles.value}>{f.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  decor: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 243,
    height: 257.5,
  },
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
  fields: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },
  fieldBox: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm + 4,
    backgroundColor: Colors.tapsBg,
    borderRadius: Radii.button,
  },
  value: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
});
