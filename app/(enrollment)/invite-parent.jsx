import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import { useEnrollment } from '../../context/EnrollmentContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RELATIONSHIPS = ['Mother', 'Father'];

export default function InviteParent() {
  const router = useRouter();
  const { parentDraft, updateParentDraft } = useEnrollment();
  const [name, setName] = useState(parentDraft.name);
  const [email, setEmail] = useState(parentDraft.email);
  const [relationship, setRelationship] = useState(parentDraft.relationship);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/enrollment');
  };

  // Next is enabled only when every field/selection is provided.
  const canNext = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && !!relationship;

  const next = () => {
    if (!canNext) return;
    updateParentDraft({ name: name.trim(), email: email.trim(), relationship });
    router.push('/invite-parent-child');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Invite Parent</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step progress */}
        <View style={styles.stepBlock}>
          <View style={styles.stepBars}>
            <View style={[styles.stepBar, styles.stepBarOn]} />
            <View style={styles.stepBar} />
            <View style={styles.stepBar} />
          </View>
          <View style={styles.stepLabelRow}>
            <Text style={styles.stepTitle}>Parent Info</Text>
            <Text style={styles.stepCount}>Step 1 of 3</Text>
          </View>
        </View>

        {/* Parent name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Parent Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter parent name"
              placeholderTextColor={Colors.gray}
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter Parent email"
              placeholderTextColor={Colors.gray}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Relationship */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Relationship to child</Text>
          <View style={styles.pillRow}>
            {RELATIONSHIPS.map((r) => {
              const on = relationship === r;
              return (
                <Pressable
                  key={r}
                  style={[styles.pill, on && styles.pillOn]}
                  onPress={() => setRelationship(r)}
                >
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            !canNext && styles.nextBtnDisabled,
            pressed && canNext && styles.pressed,
          ]}
          onPress={next}
          disabled={!canNext}
        >
          <Text style={styles.nextText}>Next</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  content: { padding: Spacing.md, gap: Spacing.lg },

  stepBlock: { gap: Spacing.sm + 4 },
  stepBars: { flexDirection: 'row', gap: Spacing.sm },
  stepBar: { flex: 1, height: 2, borderRadius: 100, backgroundColor: Colors.tapsBg },
  stepBarOn: { backgroundColor: Colors.primary },
  stepLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 18, color: Colors.textBlack },
  stepCount: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  fieldGroup: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    justifyContent: 'center',
  },
  input: { padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  pillRow: { flexDirection: 'row', gap: Spacing.sm + 4 },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillOn: { backgroundColor: Colors.primaryBgLight, borderColor: Colors.primary },
  pillText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  pillTextOn: { color: Colors.primaryText },

  footer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  nextBtn: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  nextText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
