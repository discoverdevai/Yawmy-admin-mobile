import { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, Spacing } from '../constants/theme';

const likeImage = require('../assets/images/success-like.png');

/**
 * Auto-dismissing room status confirmation (Figma 598-108021 / 598-111551).
 * No buttons — disappears after `duration` ms.
 */
export default function RoomArchivedModal({
  visible,
  onClose,
  duration = 1600,
  title = 'Room Archived Successfully!',
}) {
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Image source={likeImage} style={styles.image} contentFit="contain" />
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 343,
    backgroundColor: Colors.background,
    borderRadius: 36,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  image: { width: 144, height: 144 },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
    textAlign: 'center',
  },
});
