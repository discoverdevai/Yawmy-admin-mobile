import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import GroupUsers from '../../assets/icons/group-users.svg';
import Smile from '../../assets/icons/smile.svg';
import Attachment from '../../assets/icons/attachment.svg';
import Mic from '../../assets/icons/mic.svg';
import SendWhite from '../../assets/icons/send-white.svg';
import DoneAll from '../../assets/icons/done-all.svg';
import Trash from '../../assets/icons/trash.svg';
import Play from '../../assets/icons/play.svg';
import Pause from '../../assets/icons/pause.svg';
import Reply from '../../assets/icons/reply.svg';
import Close from '../../assets/icons/close.svg';
import Camera from '../../assets/icons/camera.svg';
import Photos from '../../assets/icons/photos.svg';
import EmojiPickerModal from '../../components/EmojiPickerModal';
import { buildChats, initialsOf } from '../../constants/chats';
import { useRooms } from '../../context/RoomsContext';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useChat } from '../../context/ChatContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Static waveform bar heights for the voice bubble (looks like WhatsApp).
const WAVE = [8, 14, 20, 12, 24, 16, 10, 22, 14, 18, 9, 20, 13, 24, 11, 17, 21, 12, 8, 15];

// A voice message with a play/pause button, waveform progress and duration.
function VoiceBubble({ uri, duration }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const playing = status?.playing;
  const total = status?.duration || duration || 0;
  const progress = total ? Math.min(1, (status?.currentTime || 0) / total) : 0;

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      if (status?.didJustFinish || (total && status?.currentTime >= total)) player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={styles.voiceRow}>
      <Pressable style={styles.voicePlay} onPress={toggle} hitSlop={6}>
        {playing ? <Pause width={22} height={22} /> : <Play width={22} height={22} />}
      </Pressable>
      <View style={styles.wave}>
        {WAVE.map((h, i) => {
          const on = i / WAVE.length <= progress;
          return <View key={i} style={[styles.waveBar, { height: h }, on ? styles.waveOn : styles.waveOff]} />;
        })}
      </View>
      <Text style={styles.voiceTime}>{fmtDuration(status?.currentTime ? total - status.currentTime : total)}</Text>
    </View>
  );
}

// A message row with WhatsApp-style swipe-right-to-reply + long-press reactions.
function MessageRow({ m, isGroup, chatName, reaction, onReply, onReact }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const bubbleRef = useRef(null);
  const replied = useRef(false);

  const onGestureEvent = (e) => {
    const x = Math.max(0, Math.min(70, e.nativeEvent.translationX));
    translateX.setValue(x);
    if (x > 55 && !replied.current) {
      replied.current = true;
      onReply(m);
    }
  };

  const onStateChange = (e) => {
    const { state } = e.nativeEvent;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      replied.current = false;
    }
  };

  const react = () => {
    const node = bubbleRef.current;
    if (!node?.measureInWindow) return onReact(m.id, 220);
    node.measureInWindow((x, y, width, height) => {
      let top = y - 60;
      if (top < 100) top = y + height + 8;
      onReact(m.id, top);
    });
  };

  const hintOpacity = translateX.interpolate({ inputRange: [0, 55], outputRange: [0, 1] });

  const Bubble = (
    <Pressable
      ref={bubbleRef}
      onLongPress={react}
      delayLongPress={250}
      style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheir]}
    >
      {m.replyTo && (
        <View style={styles.quote}>
          <Text style={styles.quoteName}>{m.replyTo.name}</Text>
          <Text style={styles.quoteText} numberOfLines={1}>
            {m.replyTo.text}
          </Text>
        </View>
      )}
      {m.type === 'voice' ? (
        <VoiceBubble uri={m.uri} duration={m.duration} />
      ) : m.type === 'image' ? (
        <Image source={{ uri: m.uri }} style={styles.msgImage} contentFit="cover" />
      ) : m.type === 'video' ? (
        <View style={styles.msgVideo}>
          <Image source={{ uri: m.uri }} style={styles.msgImage} contentFit="cover" />
          <View style={styles.videoPlayOverlay}>
            <View style={styles.videoPlayBadge}>
              <Play width={22} height={22} />
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.bubbleText}>{m.text}</Text>
      )}
      {m.mine ? (
        <View style={styles.metaMine}>
          <Text style={styles.time}>{m.time}</Text>
          <DoneAll width={16} height={16} />
        </View>
      ) : (
        <Text style={[styles.time, styles.timeTheir]}>{m.time}</Text>
      )}
      {reaction && (
        <View style={[styles.reactionChip, m.mine ? styles.reactionChipMine : styles.reactionChipTheir]}>
          <Text style={styles.reactionChipText}>{reaction}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.msgOuter}>
      <Animated.View style={[styles.replyHint, { opacity: hintOpacity }]} pointerEvents="none">
        <Reply width={20} height={20} />
      </Animated.View>
      <PanGestureHandler
        activeOffsetX={[-1000, 12]}
        failOffsetY={[-12, 12]}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onStateChange}
      >
        <Animated.View style={[m.mine ? styles.rowMine : styles.rowTheir, { transform: [{ translateX }] }]}>
          {!m.mine && (
            <View style={styles.avatar40}>
              {isGroup ? (
                <GroupUsers width={22} height={22} />
              ) : (
                <Text style={styles.avatarInitials40}>{initialsOf(chatName)}</Text>
              )}
            </View>
          )}
          {Bubble}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

export default function Conversation() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { rooms, enrolledTeachers } = useRooms();
  const { parents, staff } = useEnrollment();
  const { getThread, sendMessage, sendVoice, sendMedia, getReaction, setReaction } = useChat();

  const chats = buildChats({ rooms, parents, staff, teachers: enrolledTeachers });
  const chat = chats.find((c) => c.id === id) || chats[0];

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { name, text }
  const [showAttach, setShowAttach] = useState(false);
  const scrollRef = useRef(null);

  // Long-press reactions.
  const [anchor, setAnchor] = useState(null); // { msgId, top }
  const [quickEmojis, setQuickEmojis] = useState(['👍', '👌', '👏', '❤️', '😂']);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // MessageRow measures its own bubble and passes the reaction-bar top here.
  const openReactions = (msgId, top) => setAnchor({ msgId, top });

  // Swipe-to-reply: quote the swiped message in the composer.
  const replyText = (m) => {
    if (m.type === 'voice') return '🎤 Voice message';
    if (m.type === 'image') return '📷 Photo';
    if (m.type === 'video') return '🎥 Video';
    return m.text;
  };
  const onReply = (m) => setReplyTo({ name: m.mine ? 'You' : chat.name, text: replyText(m) });

  // Take a photo with the camera and send it.
  const takePhoto = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      sendMedia(chat.id, result.assets[0].uri, 'image');
      scrollToEnd();
    }
  };

  // Pick an image or video from the gallery and send it.
  const pickFromGallery = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to attach media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });
    if (!result.canceled) {
      const asset = result.assets[0];
      const kind = asset.type === 'video' ? 'video' : 'image';
      sendMedia(chat.id, asset.uri, kind);
      scrollToEnd();
    }
  };

  const applyReaction = (emoji) => {
    if (anchor) setReaction(chat.id, anchor.msgId, emoji);
    setAnchor(null);
  };

  // Pick a new emoji: add it to the quick-react list and react with it.
  const pickEmoji = (emoji) => {
    setQuickEmojis((list) => (list.includes(emoji) ? list : [...list, emoji]));
    if (anchor) setReaction(chat.id, anchor.msgId, emoji);
    setShowEmojiPicker(false);
    setAnchor(null);
  };

  // Voice recording state.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const dotAnim = useRef(new Animated.Value(1)).current;

  const messages = getThread(chat.id);
  const isGroup = chat.type === 'group';
  const status = isGroup ? `${chat.memberCount} members` : 'Online';

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Blink the red dot while recording; clean the timer up on unmount.
  useEffect(() => {
    if (recording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [recording, dotAnim]);

  useEffect(() => () => stopTimer(), []);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/chat');
  };

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(chat.id, draft, replyTo);
    setDraft('');
    setReplyTo(null);
    scrollToEnd();
  };

  // Start a WhatsApp-style voice recording.
  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record voice messages.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      Alert.alert('Recording failed', String(e?.message || e));
    }
  };

  // Discard the current recording.
  const cancelRecording = async () => {
    stopTimer();
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {}
    setRecording(false);
    setElapsed(0);
  };

  // Stop and send the recording as a voice message.
  const sendRecording = async () => {
    stopTimer();
    const dur = elapsed;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {}
    const uri = recorder.uri;
    setRecording(false);
    setElapsed(0);
    if (uri && dur >= 1) {
      sendVoice(chat.id, uri, dur);
      scrollToEnd();
    }
  };

  const Avatar = ({ size }) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {isGroup ? (
        <GroupUsers width={size * 0.58} height={size * 0.58} />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: size * 0.42 }]}>{initialsOf(chat.name)}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Avatar size={40} />
        <View style={styles.headerText}>
          <Text style={styles.headerName} numberOfLines={1}>
            {chat.name}
          </Text>
          <View style={styles.statusRow}>
            {!isGroup && <View style={styles.onlineDot} />}
            <Text style={[styles.statusText, !isGroup && styles.onlineText]}>{status}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={styles.dayPill}>
            <Text style={styles.dayText}>Today</Text>
          </View>

          {messages.map((m) => (
            <MessageRow
              key={m.id}
              m={m}
              isGroup={isGroup}
              chatName={chat.name}
              reaction={getReaction(chat.id, m.id)}
              onReply={onReply}
              onReact={openReactions}
            />
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          {recording ? (
            <>
              <Pressable style={styles.cancelBtn} onPress={cancelRecording} hitSlop={6}>
                <Trash width={22} height={22} />
              </Pressable>
              <View style={styles.recField}>
                <Animated.View style={[styles.recDot, { opacity: dotAnim }]} />
                <Text style={styles.recTime}>{fmtDuration(elapsed)}</Text>
                <Text style={styles.recHint}>Recording…</Text>
              </View>
              <Pressable style={styles.actionBtn} onPress={sendRecording}>
                <SendWhite width={24} height={24} />
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.inputField}>
                {replyTo && (
                  <View style={styles.replyCard}>
                    <View style={styles.replyCardBody}>
                      <Text style={styles.replyCardName}>{replyTo.name}</Text>
                      <Text style={styles.replyCardText} numberOfLines={1}>
                        {replyTo.text}
                      </Text>
                    </View>
                    <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                      <Close width={20} height={20} />
                    </Pressable>
                  </View>
                )}
                <View style={styles.inputRow}>
                  <Smile width={24} height={24} />
                  <TextInput
                    style={styles.input}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Message"
                    placeholderTextColor={Colors.gray}
                    multiline
                  />
                  <Pressable hitSlop={6} onPress={() => setShowAttach((s) => !s)}>
                    <Attachment width={24} height={24} />
                  </Pressable>
                </View>
              </View>
              {draft.trim() ? (
                <Pressable style={styles.actionBtn} onPress={send}>
                  <SendWhite width={24} height={24} />
                </Pressable>
              ) : (
                <Pressable style={styles.actionBtn} onPress={startRecording}>
                  <Mic width={24} height={24} />
                </Pressable>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Attachment menu */}
      {showAttach && (
        <>
          <Pressable style={styles.attachBackdrop} onPress={() => setShowAttach(false)} />
          <View style={styles.attachMenu}>
            <Pressable style={styles.attachItem} onPress={takePhoto}>
              <Camera width={24} height={24} />
              <Text style={styles.attachLabel}>Camera</Text>
            </Pressable>
            <Pressable style={styles.attachItem} onPress={pickFromGallery}>
              <Photos width={24} height={24} />
              <Text style={styles.attachLabel}>Photos & Videos</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Reaction bar (long-press a message) */}
      <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setAnchor(null)}>
        <Pressable style={styles.reactBackdrop} onPress={() => setAnchor(null)}>
          {anchor && (
            <View style={[styles.reactAnchor, { top: anchor.top }]} pointerEvents="box-none">
              <View style={styles.reactBar}>
                {quickEmojis.map((e) => (
                  <Pressable key={e} onPress={() => applyReaction(e)} hitSlop={4}>
                    <Text style={styles.reactEmoji}>{e}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.reactPlus} onPress={() => setShowEmojiPicker(true)} hitSlop={4}>
                  <Text style={styles.reactPlusText}>+</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>

      <EmojiPickerModal
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={pickEmoji}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: Fonts.bold, fontWeight: '600', color: Colors.primaryText },
  headerText: { flex: 1, gap: Spacing.xs },
  headerName: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#408406' },
  statusText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },
  onlineText: { color: '#408406' },

  messages: { padding: Spacing.md, gap: Spacing.sm + 4, paddingBottom: Spacing.lg },
  dayPill: {
    alignSelf: 'center',
    backgroundColor: '#F2F2F2',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  dayText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },

  msgOuter: { justifyContent: 'center' },
  replyHint: { position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center' },
  avatar40: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials40: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 17, color: Colors.primaryText },

  quote: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  quoteName: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 11, color: Colors.textBlack },
  quoteText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 11, color: Colors.gray },

  rowTheir: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, maxWidth: '88%' },
  rowMine: { alignItems: 'flex-end' },
  bubble: { padding: Spacing.sm, maxWidth: 295, gap: Spacing.xs },
  bubbleTheir: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  bubbleMine: {
    backgroundColor: Colors.primaryBg,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  bubbleText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack, lineHeight: 21 },
  msgImage: { width: 220, height: 220, borderRadius: Radii.md },
  msgVideo: { width: 220, height: 220, borderRadius: Radii.md, overflow: 'hidden' },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  videoPlayBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 245, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  timeTheir: { alignSelf: 'flex-end' },
  metaMine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  inputField: {
    flex: 1,
    gap: Spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack, maxHeight: 100 },

  // Attachment menu
  attachBackdrop: { ...StyleSheet.absoluteFillObject },
  attachMenu: {
    position: 'absolute',
    right: 64,
    bottom: 80,
    width: 200,
    backgroundColor: Colors.background,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    padding: Spacing.sm + 4,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  attachItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, height: 40 },
  attachLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },

  // Reply preview inside the composer
  replyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    padding: Spacing.sm,
  },
  replyCardBody: { flex: 1, gap: 2 },
  replyCardName: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 12, color: Colors.textBlack },
  replyCardText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 11, color: Colors.gray },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recording state
  cancelBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.accentSecBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    backgroundColor: '#F2F2F2',
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.redText },
  recTime: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack, minWidth: 40 },
  recHint: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },

  // Reaction bar
  reactBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.15)' },
  reactAnchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  reactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  reactEmoji: { fontSize: 28 },
  reactPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactPlusText: { fontSize: 20, color: Colors.gray, marginTop: -2 },

  // Applied reaction chip on a bubble
  reactionChip: {
    position: 'absolute',
    bottom: -12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionChipMine: { left: 8 },
  reactionChipTheir: { right: 8 },
  reactionChipText: { fontSize: 14 },

  // Voice message bubble
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minWidth: 200 },
  voicePlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 28 },
  waveBar: { width: 3, borderRadius: 2 },
  waveOn: { backgroundColor: Colors.primary },
  waveOff: { backgroundColor: Colors.lightGray },
  voiceTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray, minWidth: 32, textAlign: 'right' },
});
