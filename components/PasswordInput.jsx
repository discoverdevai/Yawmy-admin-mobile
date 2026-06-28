import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Lock from '../assets/icons/lock.svg';
import EyeOpen from '../assets/icons/eye-open.svg';
import EyeClose from '../assets/icons/eye-close.svg';
import { Colors, Fonts, Radii, Spacing } from '../constants/theme';

/**
 * Labelled password field with a lock icon and a show/hide (eye) toggle.
 * Matches the Figma "password-input" component.
 */
export default function PasswordInput({
  label,
  value,
  onChangeText,
  onFocus,
  placeholder = 'Enter your password',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.box}>
        <Lock width={24} height={24} />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />

        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <EyeOpen width={24} height={24} />
          ) : (
            <EyeClose width={24} height={24} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
    marginBottom: Spacing.sm + 4, // 12
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4, // 12
    height: 48,
    paddingHorizontal: Spacing.sm + 4, // 12
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
});
