import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

// A palette of emojis to pick from when adding a reaction.
const EMOJIS = [
  '👍', '👌', '👏', '❤️', '😂', '😊', '😍', '🥰',
  '😘', '😎', '🤩', '😅', '😇', '🙌', '🙏', '🔥',
  '🎉', '💯', '😢', '😭', '😡', '🤔', '😴', '🤗',
  '👀', '✅', '❌', '⭐', '🌟', '💐', '🌸', '🎈',
  '🍼', '🧸', '🎨', '📚', '⚽', '🎵', '☀️', '🌈',
];

/**
 * Bottom-sheet emoji picker used by the reaction bar's "+" button.
 */
export default function EmojiPickerModal({ visible, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <Text style={styles.title}>Add Reaction</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
                {EMOJIS.map((e) => (
                  <Pressable key={e} style={styles.cell} onPress={() => onSelect(e)}>
                    <Text style={styles.emoji}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
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
    maxHeight: '60%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '12.5%', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm },
  emoji: { fontSize: 28 },
});
