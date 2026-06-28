import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Check from '../assets/icons/check.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

// Week starts on Saturday (Egyptian calendar) to match the setup order.
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Bottom-sheet to edit the operating days of the week. Opens with the current
 * selection; Confirm reports the new list.
 */
export default function DaysModal({ visible, value = [], onClose, onConfirm }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible) setSelected(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (day) =>
    setSelected((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day]));

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>Days of the Week</Text>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {DAYS.map((day) => {
                  const on = selected.includes(day);
                  return (
                    <Pressable key={day} style={styles.dayRow} onPress={() => toggle(day)}>
                      <Text style={styles.dayText}>{day}</Text>
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on && <Check width={16} height={16} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onConfirm(DAYS.filter((d) => selected.includes(d)))}
              >
                <Text style={styles.ctaText}>Confirm Days</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '70%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  list: { flexGrow: 0 },
  dayRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: Colors.primary },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
