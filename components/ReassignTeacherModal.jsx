import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CheckWhite from '../assets/icons/check-white.svg';
import RoomIcon from '../assets/icons/tab-rooms.svg';
import AuthImage from './AuthImage';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Bottom-sheet multi-select room picker for reassigning a teacher (Figma
 * 598-109118). A teacher can belong to several rooms, so each room has a
 * checkbox. `rooms` are the candidates; `initialSelected` the current rooms.
 */
export default function ReassignTeacherModal({
  visible,
  rooms = [],
  initialSelected = [],
  onClose,
  onConfirm,
}) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible) setSelected(initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <View style={styles.head}>
                <Text style={styles.title}>Reassign Teacher</Text>
                <Text style={styles.subtitle}>Choose a room to reassign a teacher.</Text>
              </View>

              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {rooms.map((r) => {
                  const sel = selected.includes(r.id);
                  const childCount = r.childCount ?? 0;
                  const slots = Math.max((r.capacity ?? 0) - childCount, 0);
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => toggle(r.id)}
                      style={[styles.room, sel && styles.roomOn]}
                    >
                      <View style={styles.roomAvatar}>
                        {r.imageUrl ? (
                          <AuthImage path={r.imageUrl} style={styles.roomAvatarImg} contentFit="cover" />
                        ) : (
                          <RoomIcon width={22} height={22} />
                        )}
                      </View>
                      <View style={styles.roomText}>
                        <Text style={styles.roomName}>{r.name}</Text>
                        <Text style={styles.roomSlots}>
                          {childCount} children, {slots} available slots
                        </Text>
                      </View>
                      <View style={[styles.checkbox, sel && styles.checkboxOn]}>
                        {sel && <CheckWhite width={16} height={16} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onConfirm(selected)}
              >
                <Text style={styles.ctaText}>Reassign Teacher</Text>
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
    maxHeight: '80%',
  },
  content: { padding: Spacing.md, gap: Spacing.sm + 4 },
  head: { gap: Spacing.sm },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  subtitle: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  list: { flexGrow: 0 },
  listContent: { gap: Spacing.sm + 4 },
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  roomOn: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  roomAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.button,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roomAvatarImg: { width: 40, height: 40, borderRadius: Radii.button },
  roomText: { flex: 1, gap: Spacing.xs },
  roomName: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  roomSlots: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
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
