import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Upload from '../../assets/icons/upload.svg';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useSetup } from '../../context/SetupContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function NurseryInfo() {
  const router = useRouter();
  const [logo, setLogo] = useState(null);
  const [name, setName] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;
  const setup = useSetup();

  const canSubmit = !!logo && name.trim().length > 0;

  // Push the whole screen up by the keyboard height, restore on close.
  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo access so you can upload your nursery logo.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // only images (no videos)
      allowsMultipleSelection: false, // exactly one file
      selectionLimit: 1, // iOS: cap the picker at a single image
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setLogo(result.assets[0]);
    }
  };

  const handleNext = () => {
    if (!canSubmit) return;
    setup.setNurseryName(name.trim());
    setup.setLogo(logo);
    router.push('/nursery-location');
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
          {/* Header: stepper + title + subtitle */}
          <View style={styles.headerBlock}>
            <View style={styles.stepperGroup}>
              <View style={styles.stepperRow}>
                <View style={[styles.stepBar, styles.stepActive]} />
                <View style={[styles.stepBar, styles.stepInactive]} />
                <View style={[styles.stepBar, styles.stepInactive]} />
              </View>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Nursery Info</Text>
                <Text style={styles.step}>Step 1 of 3</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Enter your nursery name and upload your logo to personalize your
              account.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Logo upload */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nursery Logo</Text>
              <Pressable style={styles.uploadBox} onPress={pickLogo}>
                {logo ? (
                  <Image
                    source={{ uri: logo.uri }}
                    style={styles.logoPreview}
                    contentFit="contain"
                  />
                ) : (
                  <View style={styles.uploadPrompt}>
                    <Upload width={24} height={24} />
                    <Text style={styles.uploadText}>
                      Tap to upload your media{'\n'}(JPG, PNG)
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Nursery name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nursery Name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter nursery name"
                  placeholderTextColor={Colors.gray}
                  returnKeyType="done"
                />
              </View>
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
            onPress={handleNext}
            disabled={!canSubmit}
          >
            <Text style={styles.buttonText}>Next</Text>
          </Pressable>
        </View>
      </Animated.View>
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
    gap: Spacing.lg, // 24 between header and form
  },

  // Header
  headerBlock: { gap: Spacing.sm }, // 8
  stepperGroup: { gap: Spacing.sm + 4 }, // 12
  stepperRow: { flexDirection: 'row', gap: Spacing.sm }, // 8
  stepBar: { flex: 1, height: 2, borderRadius: Radii.full },
  stepActive: { backgroundColor: Colors.primary },
  stepInactive: { backgroundColor: Colors.tapsBg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
  },
  step: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
  },

  // Form
  form: { gap: Spacing.md }, // 16
  fieldGroup: { gap: Spacing.sm + 4 }, // 12
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },

  // Upload
  uploadBox: {
    height: 106,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderStyle: 'dashed',
    borderRadius: Radii.md, // 12
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm + 4,
    overflow: 'hidden',
  },
  uploadPrompt: { alignItems: 'center', gap: Spacing.sm }, // 8
  uploadText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },
  logoPreview: { width: '100%', height: '100%' },

  // Name input
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button, // 20
    paddingHorizontal: Spacing.sm + 4,
    justifyContent: 'center',
  },
  input: {
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },

  // Footer
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
