import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Check from '../../assets/icons/check.svg';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { useSetup } from '../../context/SetupContext';
import {
  updateNursery,
  uploadLogo,
  updateGeofence,
  toBackendTime,
  toBackendDays,
} from '../../services/nurseryService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// Week starts on Saturday (Egyptian calendar) to match the design order.
const DAYS = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

const pad = (n) => String(n).padStart(2, '0');

// ── Up / number / down stepper ────────────────────────────────
function Stepper({ value, onUp, onDown }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onUp} hitSlop={6}>
        <ChevronDown width={24} height={24} style={styles.chevronUp} />
      </Pressable>
      <Text style={styles.stepNumber}>{value}</Text>
      <Pressable onPress={onDown} hitSlop={6}>
        <ChevronDown width={24} height={24} />
      </Pressable>
    </View>
  );
}

// ── From / To time cell ───────────────────────────────────────
function TimeField({ label, side, value, onChange }) {
  const changeHour = (delta) => {
    let h = value.hour + delta;
    if (h > 12) h = 1;
    if (h < 1) h = 12;
    onChange({ ...value, hour: h });
  };
  const changeMinute = (delta) => {
    let m = value.minute + delta;
    if (m >= 60) m = 0;
    if (m < 0) m = 55;
    onChange({ ...value, minute: m });
  };
  const togglePeriod = () =>
    onChange({ ...value, period: value.period === 'AM' ? 'PM' : 'AM' });

  return (
    <View style={styles.timeCol}>
      <View
        style={[
          styles.timeHeader,
          side === 'from' ? styles.roundTL : styles.roundTR,
        ]}
      >
        <Text style={styles.timeHeaderText}>{label}</Text>
      </View>
      <View
        style={[
          styles.timeBody,
          side === 'from' ? styles.roundBL : styles.roundBR,
        ]}
      >
        <Stepper
          value={pad(value.hour)}
          onUp={() => changeHour(1)}
          onDown={() => changeHour(-1)}
        />
        <Text style={styles.colon}>:</Text>
        <Stepper
          value={pad(value.minute)}
          onUp={() => changeMinute(5)}
          onDown={() => changeMinute(-5)}
        />
        <Pressable onPress={togglePeriod} hitSlop={6}>
          <Text style={styles.period}>
            {value.period === 'AM' ? 'Am' : 'Pm'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function NurseryHours() {
  const router = useRouter();
  const setup = useSetup();
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const { days, setDays, hours, setHours } = setup;

  const toggleDay = (day) => {
    setDays(
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  };

  const daysSummary = days.length
    ? DAYS.filter((d) => days.includes(d)).join(', ')
    : 'Select days';

  const goPrevious = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/nursery-location-confirm');
  };

  // Final step of the wizard: persist everything collected across steps 1–3.
  const goNext = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 1. Name + operating hours + working days.
      await updateNursery({
        name: setup.nurseryName,
        hoursStart: toBackendTime(hours.from),
        hoursEnd: toBackendTime(hours.to),
        workingDays: toBackendDays(days),
      });

      // 2. Logo (step 1) — upload the picked file, backend returns the logoUrl.
      if (setup.logo) {
        await uploadLogo(setup.logo);
      }

      // 3. Geofence (step 2) — SetupContext stores center as [lng, lat] + placeName.
      if (setup.location?.center) {
        const [lng, lat] = setup.location.center;
        await updateGeofence({
          lat,
          lng,
          radiusM: Math.round(setup.radius),
          locationText: setup.location?.placeName || undefined,
        });
      }

      setShowSuccess(true);
    } catch (e) {
      setNotice({
        title: 'Setup failed',
        message: e.message || 'Could not save your nursery setup. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToApp = () => {
    setShowSuccess(false);
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.flex}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.stepperGroup}>
              <View style={styles.stepperRow}>
                <View style={[styles.stepBar, styles.stepActive]} />
                <View style={[styles.stepBar, styles.stepActive]} />
                <View style={[styles.stepBar, styles.stepActive]} />
              </View>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Nursery Hours</Text>
                <Text style={styles.step}>Step 3 of 3</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              Set your nursery’s operating hours to help parents know when the
              nursery is open.
            </Text>
          </View>

          {/* Days of the week */}
          <View style={styles.daysGroup}>
            <Text style={styles.label}>Days of the Week</Text>
            <View style={styles.daysControl}>
              <Pressable
                style={[styles.dropdownField, open && styles.dropdownFieldOpen]}
                onPress={() => setOpen((o) => !o)}
              >
                <Text
                  style={[styles.placeholder, days.length > 0 && styles.filled]}
                  numberOfLines={1}
                >
                  {daysSummary}
                </Text>
                <ChevronDown
                  width={24}
                  height={24}
                  style={open ? styles.chevronUp : undefined}
                />
              </Pressable>

              {open && (
                <View style={styles.dropdownPanel}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {DAYS.map((day) => {
                      const selected = days.includes(day);
                      return (
                        <Pressable
                          key={day}
                          style={styles.dayRow}
                          onPress={() => toggleDay(day)}
                        >
                          <Text style={styles.dayText}>{day}</Text>
                          <View
                            style={[styles.checkbox, selected && styles.checkboxOn]}
                          >
                            {selected && <Check width={16} height={16} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Nursery hours */}
          <View style={styles.hoursGroup}>
            <Text style={styles.label}>Select Nursery Hours</Text>
            <View style={styles.timeRow}>
              <TimeField
                label="From:"
                side="from"
                value={hours.from}
                onChange={(v) => setHours({ ...hours, from: v })}
              />
              <TimeField
                label="To:"
                side="to"
                value={hours.to}
                onChange={(v) => setHours({ ...hours, to: v })}
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
            onPress={goPrevious}
          >
            <Text style={styles.outlineText}>Previous</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              submitting && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={goNext}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Saving…' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>

      <SuccessModal
        visible={showSuccess}
        onContinue={handleContinueToApp}
        title="Nursery Setup Successful!"
        message="Setup is complete. You can now start using your dashboard and manage your nursery."
      />

      <ErrorModal
        visible={!!notice}
        title={notice?.title}
        message={notice?.message}
        buttonText="OK"
        onClose={() => setNotice(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.lg, // 24
  },

  // Header
  headerBlock: { gap: Spacing.sm },
  stepperGroup: { gap: Spacing.sm + 4 },
  stepperRow: { flexDirection: 'row', gap: Spacing.sm },
  stepBar: { flex: 1, height: 2, borderRadius: Radii.full },
  stepActive: { backgroundColor: Colors.primary },
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

  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },

  // Days dropdown
  daysGroup: { gap: Spacing.sm + 4 },
  daysControl: { gap: Spacing.sm }, // 8 between field and panel
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  dropdownFieldOpen: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBgLight,
  },
  placeholder: {
    flexShrink: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.gray,
  },
  filled: {
    color: Colors.textBlack,
  },
  dropdownPanel: {
    height: 134,
    backgroundColor: Colors.primaryBgLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    overflow: 'hidden',
  },
  dayRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: Colors.primary,
  },

  // Hours
  hoursGroup: { gap: Spacing.sm + 4 },
  timeRow: { flexDirection: 'row' },
  timeCol: { flex: 1 },
  timeHeader: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: Colors.secBg,
    borderWidth: 0.5,
    borderColor: Colors.secBorder,
  },
  timeHeaderText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.gray,
  },
  timeBody: {
    height: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secBg,
    borderWidth: 0.5,
    borderColor: Colors.secBorder,
    borderTopWidth: 0,
  },
  roundTL: { borderTopLeftRadius: Radii.md },
  roundTR: { borderTopRightRadius: Radii.md },
  roundBL: { borderBottomLeftRadius: Radii.md },
  roundBR: { borderBottomRightRadius: Radii.md },
  stepper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chevronUp: {
    transform: [{ rotate: '180deg' }],
  },
  stepNumber: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
  },
  colon: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
  },
  period: {
    fontFamily: Fonts.medium,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.gray,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  outlineButton: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.primary,
  },
  button: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  buttonDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
});
