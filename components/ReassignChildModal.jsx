import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Bottom-sheet room picker for reassigning a single child (Figma 598-108642).
 * `rooms` are the candidate destinations, each carrying a `slots` field.
 */
export default function ReassignChildModal({
  visible,
  rooms = [],
  allowFull = false,
  currentRoomId = null, // the child's current room — shown highlighted but not selectable
  onClose,
  onConfirm,
}) {
  const [selected, setSelected] = useState(null);
  const [noSlots, setNoSlots] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setNoSlots(false);
    }
  }, [visible]);

  const confirm = () => {
    if (selected == null) return;
    const room = rooms.find((r) => r.id === selected);
    if (room && room.slots <= 0) {
      setNoSlots(true); // full room — warn and let them pick another
      return;
    }
    onConfirm(selected);
  };

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
                <Text style={styles.title}>Reassign Child</Text>
                <Text style={styles.subtitle}>Choose a room to reassign a Child.</Text>
              </View>

              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {rooms.map((r) => {
                  const isCurrent = r.id === currentRoomId;
                  const full = !allowFull && r.slots <= 0;
                  const disabled = isCurrent || full; // can't reassign to the current room
                  const sel = selected === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      disabled={disabled}
                      onPress={() => setSelected(r.id)}
                      style={[
                        styles.room,
                        (sel || isCurrent) && styles.roomOn,
                        full && styles.roomDisabled,
                      ]}
                    >
                      <View style={styles.roomAvatar}>
                        <Image source={r.img} style={styles.roomAvatarImg} contentFit="contain" />
                      </View>
                      <View style={styles.roomText}>
                        <Text style={styles.roomName}>{r.name}</Text>
                        <Text style={styles.roomSlots}>
                          {r.childIds.length} children, {r.slots} available slots
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  selected == null && styles.ctaDisabled,
                  pressed && selected != null && styles.pressed,
                ]}
                onPress={confirm}
                disabled={selected == null}
              >
                <Text style={styles.ctaText}>Reassign Child</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {noSlots && (
          <View style={styles.alertOverlay}>
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>No Available Slots</Text>
              <Text style={styles.alertMsg}>
                This room has no available slots. Please choose another room.
              </Text>
              <Pressable style={styles.alertBtn} onPress={() => setNoSlots(false)}>
                <Text style={styles.alertBtnText}>Got It</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '75%',
  },
  content: { padding: Spacing.md, gap: Spacing.sm + 4 },
  head: { gap: Spacing.sm },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
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
  roomOn: {
    backgroundColor: Colors.tapsBg,
    borderColor: Colors.primary,
  },
  roomDisabled: { opacity: 0.5 },
  roomAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.button,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomAvatarImg: { width: 28, height: 28 },
  roomText: { flex: 1, gap: Spacing.xs },
  roomName: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  roomSlots: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },

  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  alertCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.background,
    borderRadius: Radii.button,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  alertTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  alertMsg: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },
  alertBtn: {
    height: 48,
    alignSelf: 'stretch',
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBtnText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
