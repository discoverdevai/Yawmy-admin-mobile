import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

/**
 * Bottom-sheet to pick a single room to share an announcement with
 * (Figma 803-27233). Confirm reports the chosen room id.
 */
export default function RoomSelectModal({
  visible,
  rooms = [],
  initialRoomId = null,
  onClose,
  onConfirm,
  subtitle = 'Choose a room to share announcement .',
}) {
  const [selected, setSelected] = useState(initialRoomId);

  useEffect(() => {
    if (visible) setSelected(initialRoomId);
  }, [visible, initialRoomId]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <View style={styles.head}>
                <Text style={styles.title}>Specific Room</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {rooms.map((r) => {
                  const on = selected === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      style={[styles.roomCard, on && styles.roomCardOn]}
                      onPress={() => setSelected(r.id)}
                    >
                      <View style={styles.roomAvatar}>
                        <Image source={r.img} style={styles.roomImg} contentFit="cover" />
                      </View>
                      <View style={styles.roomText}>
                        <Text style={styles.roomName}>{r.name}</Text>
                        <Text style={styles.roomCount}>{r.childIds.length} Child</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, !selected && styles.ctaDisabled, pressed && styles.pressed]}
                onPress={() => selected && onConfirm(selected)}
                disabled={!selected}
              >
                <Text style={styles.ctaText}>Confirm</Text>
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
  content: { padding: Spacing.md, gap: Spacing.md },

  head: { gap: Spacing.sm },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  subtitle: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  list: { flexGrow: 0 },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.stroke,
    marginBottom: Spacing.sm + 4,
  },
  roomCardOn: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  roomAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.button,
    backgroundColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roomImg: { width: 40, height: 40 },
  roomText: { flex: 1, gap: Spacing.xs },
  roomName: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  roomCount: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
