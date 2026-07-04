import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sms from '../assets/icons/sms.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());

/**
 * "Request New Link" bottom-sheet shown when the invitation has expired
 * (Figma 612-31111). Email is mandatory, message optional.
 */
export default function RequestLinkModal({ visible, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setEmail('');
      setMessage('');
    }
  }, [visible]);

  const valid = isEmail(email);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <View style={styles.head}>
                <Text style={styles.title}>Request New Link</Text>
                <Text style={styles.subtitle}>
                  Your invitation link has expired. You can request a new one from the admin.
                </Text>
              </View>

              {/* Email (mandatory) */}
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputBox}>
                  <Sms width={24} height={24} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your Email"
                    placeholderTextColor={Colors.gray}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Message (optional) */}
              <View style={styles.field}>
                <Text style={styles.label}>Message</Text>
                <View style={styles.textareaBox}>
                  <TextInput
                    style={styles.textarea}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Add any extra details (optional)"
                    placeholderTextColor={Colors.gray}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <Pressable
                style={[styles.cta, !valid && styles.ctaDisabled]}
                onPress={() => valid && onSubmit(email.trim(), message.trim())}
                disabled={!valid}
              >
                <Text style={styles.ctaText}>Request a New Link</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
  },
  content: { padding: Spacing.md, gap: Spacing.md },

  head: { gap: Spacing.sm },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  subtitle: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray, lineHeight: 20 },

  field: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  input: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  textareaBox: {
    height: 113,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
  },
  textarea: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
