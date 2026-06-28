import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePlaceholder from '../../assets/icons/image-placeholder.svg';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';
import { NURSERY_NAME } from '../../constants/invitation';

export default function InvitationValidation() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Centered content: nursery image + welcome copy */}
      <View style={styles.content}>
        <View style={styles.card}>
          <ImagePlaceholder width={163} height={163} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Welcome to {NURSERY_NAME}</Text>
          <Text style={styles.subtitle}>
            You’re in. Your access is ready—start managing your nursery with
            ease.
          </Text>
        </View>
      </View>

      {/* Continue */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/set-password')}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: '100%',
    height: 308,
    backgroundColor: Colors.placeholder,
    borderRadius: Radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.xxl, // 48 gap from the card
    gap: Spacing.md, // 16 between title and subtitle
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
