import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { fileHeaders } from '../config/api';
import { Colors, Fonts, Spacing } from '../constants/theme';

/**
 * Full-screen viewer for a chat photo or video.
 *
 * A 220×160 thumbnail is enough to know a photo arrived and not enough to read
 * a note pinned to a wall or see a child's face — so tapping opens the real
 * thing. Video needs this more than photos: a still frame with a play badge
 * looks playable and, without a player behind it, simply is not.
 *
 * Both sources carry the bearer token. `/api/files/**` is authenticated, and
 * neither the image loader nor the video player goes through apiRequest.
 */
export default function MediaViewerModal({ visible, attachment, onClose }) {
  const { width, height } = useWindowDimensions();
  const isVideo = attachment?.type === 'VIDEO';
  const remote = attachment?.uri && /^https?:/i.test(attachment.uri);
  const source = attachment?.uri
    ? remote
      ? { uri: attachment.uri, headers: fileHeaders() }
      : { uri: attachment.uri }
    : null;

  // Hooks cannot be conditional, so the player is always created; it simply has
  // nothing to load when the open attachment is a photo.
  const player = useVideoPlayer(isVideo ? source : null, (p) => {
    if (p) p.loop = false;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeArea} onPress={onClose} accessibilityLabel="Close" />

        {attachment ? (
          isVideo ? (
            <VideoView
              player={player}
              style={{ width, height: height * 0.7 }}
              contentFit="contain"
              allowsFullscreen
              nativeControls
            />
          ) : (
            <Image
              source={source}
              style={{ width, height: height * 0.8 }}
              contentFit="contain"
              transition={120}
            />
          )
        ) : null}

        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>

        {attachment?.filename ? (
          <Text style={styles.caption} numberOfLines={1}>
            {attachment.filename}
          </Text>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000EE', alignItems: 'center', justifyContent: 'center' },
  // Sits behind the media so a tap anywhere around it dismisses, the way a
  // photo viewer is expected to behave.
  closeArea: { ...StyleSheet.absoluteFillObject },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF22',
  },
  closeText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.white },
  caption: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: Spacing.lg,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#FFFFFFCC',
  },
});
