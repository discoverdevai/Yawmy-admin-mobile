import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
import VolumeSlash from '../../assets/icons/volume-slash.svg';
import VolumeOn from '../../assets/icons/volume-on.svg';
import EmojiPickerModal from '../../components/EmojiPickerModal';
import MediaViewerModal from '../../components/MediaViewerModal';
import DeleteChildModal from '../../components/DeleteChildModal';
import MuteUserModal from '../../components/MuteUserModal';
import ErrorModal from '../../components/ErrorModal';
import { fileHeaders } from '../../config/api';
import { openAttachment } from '../../services/attachmentOpener';
import { dayLabel, midnight, sameDay } from '../../utils/date';
import { useAuth } from '../../context/AuthContext';
import {
  ensureThread,
  getMessages,
  sendMessage,
  markRead,
  addReaction,
  removeReaction,
  deleteMessageForEveryone,
  hideMessageForMe,
  muteUser,
  unmuteUser,
  getMutedUserIds,
  uploadChatMedia,
  normalizeMessage,
} from '../../services/chatService';
import { connectChatSocket } from '../../services/chatSocket';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

// How often to ask for new messages while the socket is down. Only runs when
// disconnected — with a live socket this never fires.
const POLL_INTERVAL_MS = 4000;

/** Two-letter initials from a name, e.g. "Anna Kim" → "AK". */
function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** "02:45 PM" — the stamp on a message sent right now, before the server replies. */
function nowClock() {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

const fmtDuration = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Static waveform bar heights for the voice bubble (looks like WhatsApp).
const WAVE = [8, 14, 20, 12, 24, 16, 10, 22, 14, 18, 9, 20, 13, 24, 11, 17, 21, 12, 8, 15];

// Speeds worth offering. Faster than 2× stops being intelligible, and anything
// below 1× is not what someone skimming a message wants.
const SPEEDS = [1, 1.5, 2];

/**
 * What expo-audio should load for a given uri.
 *
 * Every /api/files/** path requires authentication, and the audio loader does
 * not go through apiRequest — a bare string uri gets a 403 and the bubble sits
 * there refusing to play, with nothing to indicate why. A local recording
 * (file://) is played back before it has been uploaded and must NOT carry the
 * header, since it never reaches the server at all.
 */
function audioSourceFor(uri) {
  if (!uri) return null;
  if (!/^https?:/i.test(uri)) return uri;
  return { uri, headers: fileHeaders() };
}

// A voice message with play/pause, waveform progress, duration and a speed toggle.
function VoiceBubble({ uri, duration }) {
  const player = useAudioPlayer(audioSourceFor(uri));
  const status = useAudioPlayerStatus(player);
  const playing = status?.playing;
  const total = status?.duration || duration || 0;
  const progress = total ? Math.min(1, (status?.currentTime || 0) / total) : 0;
  const [speedIndex, setSpeedIndex] = useState(0);
  const speed = SPEEDS[speedIndex];

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      if (status?.didJustFinish || (total && status?.currentTime >= total)) player.seekTo(0);
      player.play();
    }
  };

  /**
   * Cycle 1× → 1.5× → 2× → 1×. Pitch correction is on, so a sped-up voice still
   * sounds like the person who recorded it rather than a chipmunk.
   */
  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    try {
      player.setPlaybackRate(SPEEDS[next], 'high');
    } catch {
      // Older runtimes reject the pitch-correction argument; the rate alone is
      // still worth having.
      try {
        player.setPlaybackRate(SPEEDS[next]);
      } catch {
        /* the platform cannot change rate — leave playback as it is */
      }
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
      <Pressable
        style={[styles.speedChip, speed !== 1 && styles.speedChipOn]}
        onPress={cycleSpeed}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Playback speed ${speed}×, tap to change`}
      >
        <Text style={[styles.speedText, speed !== 1 && styles.speedTextOn]}>{speed}×</Text>
      </Pressable>
    </View>
  );
}

/** "1.4 MB" / "312 KB" — a document's size, at the precision anyone reads it. */
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A document attachment: name, size, and a tap to open it in the OS viewer. */
function DocumentBubble({ attachment, onOpen }) {
  return (
    <Pressable style={styles.docRow} onPress={() => onOpen(attachment)}>
      <View style={styles.docIcon}>
        <Text style={styles.docExt}>
          {(attachment?.filename || '').split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE'}
        </Text>
      </View>
      <View style={styles.docMeta}>
        <Text style={styles.docName} numberOfLines={1}>
          {attachment?.filename || 'Attachment'}
        </Text>
        <Text style={styles.docSize}>{fmtSize(attachment?.sizeBytes)}</Text>
      </View>
    </Pressable>
  );
}

/**
 * The reaction chips under a bubble.
 *
 * The backend counts reactions per emoji across everyone, so a room group shows
 * "👍 3" rather than only the last person's choice.
 */
function ReactionChips({ reactions, myUserId, mine }) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users?.length);
  if (entries.length === 0) return null;
  return (
    <View style={[styles.reactionChip, mine ? styles.reactionChipMine : styles.reactionChipTheir]}>
      {entries.map(([emoji, users]) => (
        <View key={emoji} style={styles.reactionCount}>
          <Text style={styles.reactionChipText}>{emoji}</Text>
          {users.length > 1 && <Text style={styles.reactionNum}>{users.length}</Text>}
          {users.includes(myUserId) && <View style={styles.reactionMineDot} />}
        </View>
      ))}
    </View>
  );
}

function MessageRow({ m, isGroup, chatName, myUserId, onReply, onReact, onOpenDoc, onOpenMedia }) {
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
          <Text style={styles.quoteName}>{m.replyTo.name || 'Reply'}</Text>
          <Text style={styles.quoteText} numberOfLines={1}>
            {m.replyTo.text}
          </Text>
        </View>
      )}
      {/* In a group, whose message this is matters as much as what it says. */}
      {isGroup && !m.mine && m.senderName ? (
        <Text style={styles.senderName}>{m.senderName}</Text>
      ) : null}

      {m.type === 'voice' ? (
        <VoiceBubble uri={m.uri} duration={m.duration} />
      ) : m.type === 'image' ? (
        // A thumbnail is enough to know a photo arrived, not enough to read it.
        <Pressable onPress={() => onOpenMedia(m.attachments[0])}>
          <Image
            source={{ uri: m.uri, headers: fileHeaders() }}
            style={styles.msgImage}
            contentFit="cover"
          />
        </Pressable>
      ) : m.type === 'video' ? (
        // The badge promises playback, so it has to actually open a player.
        <Pressable style={styles.msgVideo} onPress={() => onOpenMedia(m.attachments[0])}>
          <Image
            source={{ uri: m.uri, headers: fileHeaders() }}
            style={styles.msgImage}
            contentFit="cover"
          />
          <View style={styles.videoPlayOverlay}>
            <View style={styles.videoPlayBadge}>
              <Play width={22} height={22} />
            </View>
          </View>
        </Pressable>
      ) : m.type === 'document' ? (
        <DocumentBubble attachment={m.attachments[0]} onOpen={onOpenDoc} />
      ) : null}

      {/* A caption sent alongside an attachment is still text worth showing. */}
      {m.text && m.type !== 'text' ? (
        <Text style={[styles.bubbleText, styles.caption]}>{m.text}</Text>
      ) : null}
      {m.type === 'text' ? <Text style={styles.bubbleText}>{m.text}</Text> : null}

      {m.mine ? (
        <View style={styles.metaMine}>
          <Text style={styles.time}>{m.time}</Text>
          {m.failed ? (
            <Text style={styles.failedMark}>Failed</Text>
          ) : (
            <DoneAll width={16} height={16} opacity={m.pending ? 0.4 : 1} />
          )}
        </View>
      ) : (
        <Text style={[styles.time, styles.timeTheir]}>{m.time}</Text>
      )}
      <ReactionChips reactions={m.reactions} myUserId={myUserId} mine={m.mine} />
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
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const myUserId = user?.id ?? null;

  // The list hands over a directory row, not a thread: a contact nobody has
  // messaged has no thread until the first message creates one.
  const entry = useMemo(
    () => ({
      kind: String(params.kind || 'ADMIN_SUPPORT'),
      peerUserId: params.peerUserId ? String(params.peerUserId) : null,
      roomId: params.roomId ? String(params.roomId) : null,
      threadId: params.threadId ? String(params.threadId) : null,
    }),
    [params.kind, params.peerUserId, params.roomId, params.threadId]
  );
  const chatName = String(params.name || 'Chat');
  const subtitle = String(params.subtitle || '');
  const isGroup = entry.kind === 'ROOM_GROUP' || entry.kind === 'STAFF_GROUP';

  const [threadId, setThreadId] = useState(entry.threadId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [mutedUsers, setMutedUsers] = useState([]);
  const socketRef = useRef(null);
  const tempSeq = useRef(0);
  // The newest server timestamp we hold, so the poll can ask for "anything after
  // this" instead of refetching a page and diffing it.
  const latestAtRef = useRef(null);
  // The oldest, for paging backwards through history.
  const oldestAtRef = useRef(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [reachedStart, setReachedStart] = useState(false);
  const contentHeightRef = useRef(0);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { name, text }
  const [showAttach, setShowAttach] = useState(false);
  // The photo or video opened full-screen, if any.
  const [viewing, setViewing] = useState(null);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Long-press reactions + message options (mute / delete).
  const [anchor, setAnchor] = useState(null); // { msgId, top }
  const [quickEmojis, setQuickEmojis] = useState(['👍', '👌', '👏', '❤️', '😂']);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // msgId
  const [muteTarget, setMuteTarget] = useState(null); // { sender }
  const [notice, setNotice] = useState(null); // { title, message }

  // MessageRow measures its own bubble and passes the reaction-bar top here.
  const openReactions = (msgId, top) => setAnchor({ msgId, top });

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  /**
   * Fetch the page before the oldest message on screen.
   *
   * The scroll position has to be preserved by hand. Prepending rows moves
   * everything below them down by exactly the height the new rows added, so the
   * conversation would jump away from whatever was being read. We note the
   * content height before, and after layout scroll down by the difference —
   * which leaves the same message under the reader's thumb.
   */
  const loadOlder = useCallback(async () => {
    if (!threadId || loadingOlder || reachedStart || !oldestAtRef.current) return;
    setLoadingOlder(true);
    const heightBefore = contentHeightRef.current;
    try {
      const rows = await getMessages(threadId, { before: oldestAtRef.current, limit: 50 });
      if (rows.length === 0) {
        setReachedStart(true);
        return;
      }
      const older = rows.map((dto) => normalizeMessage(dto, myUserId));
      oldestAtRef.current = older[0]?.createdAt ?? oldestAtRef.current;
      // A short page means the thread has no more history behind it.
      if (rows.length < 50) setReachedStart(true);

      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const fresh = older.filter((m) => !known.has(m.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });

      requestAnimationFrame(() => {
        const grew = contentHeightRef.current - heightBefore;
        if (grew > 0) scrollRef.current?.scrollTo({ y: grew, animated: false });
      });
    } catch {
      /* a failed page is not worth an alert — scrolling up again retries */
    } finally {
      setLoadingOlder(false);
    }
  }, [threadId, loadingOlder, reachedStart, myUserId]);

  /**
   * Fold incoming messages into the list.
   *
   * Two things arrive out of order: the socket echo of a message we just sent,
   * and the REST response for that same send. Both carry the real id, so an id
   * match is the first defence; replacing our optimistic copy is the second.
   */
  const mergeMessages = useCallback((incoming) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      let changed = false;
      incoming.forEach((msg) => {
        if (byId.has(msg.id)) return;
        byId.set(msg.id, msg);
        changed = true;
      });
      if (!changed) return prev;
      const merged = [...byId.values()].sort(
        (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
      );
      const newest = merged[merged.length - 1];
      if (newest?.createdAt) latestAtRef.current = newest.createdAt;
      return merged;
    });
  }, []);

  // ---- open the thread, load history, subscribe ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const id = entry.threadId || (await ensureThread(entry));
        if (cancelled) return;
        if (!id) throw new Error('This conversation is not available.');
        setThreadId(id);

        const history = await getMessages(id, { limit: 50 });
        if (cancelled) return;
        const normalized = history.map((dto) => normalizeMessage(dto, myUserId));
        setMessages(normalized);
        const newest = normalized[normalized.length - 1];
        latestAtRef.current = newest?.createdAt ?? null;
        oldestAtRef.current = normalized[0]?.createdAt ?? null;
        // A first page shorter than the limit is the whole conversation.
        setReachedStart(normalized.length < 50);
        if (newest) markRead(id, newest.id).catch(() => {});

        socketRef.current = connectChatSocket({
          onThreadMessage: (dto) => mergeMessages([normalizeMessage(dto, myUserId)]),
          onConnectionChange: setConnected,
        });
        socketRef.current.subscribeToThread(id);

        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(e.message || 'Could not open this conversation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [entry, myUserId, mergeMessages]);

  // Who this admin has already muted, so the menu offers the right action.
  useEffect(() => {
    getMutedUserIds().then(setMutedUsers).catch(() => {});
  }, []);

  // ---- polling fallback ----
  // Only while the socket is down, and asking only for what we do not have.
  useEffect(() => {
    if (!threadId || connected || loading || loadError) return undefined;
    const timer = setInterval(async () => {
      try {
        const rows = await getMessages(threadId, {
          after: latestAtRef.current ?? undefined,
          limit: 50,
        });
        if (rows.length) mergeMessages(rows.map((dto) => normalizeMessage(dto, myUserId)));
      } catch {
        /* a failed poll is not worth surfacing; the next may work */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [threadId, connected, loading, loadError, myUserId, mergeMessages]);

  // Swipe-to-reply: quote the swiped message in the composer.
  const replyText = (m) => {
    if (m.type === 'voice') return '🎤 Voice message';
    if (m.type === 'image') return '📷 Photo';
    if (m.type === 'video') return '🎥 Video';
    if (m.type === 'document') return m.attachments[0]?.filename || '📄 Document';
    return m.text;
  };
  const onReply = (m) =>
    setReplyTo({ id: m.id, name: m.mine ? 'You' : m.senderName || chatName, text: replyText(m) });

  /**
   * Put a message on screen before the server has it, and reconcile once it
   * answers. Chat that waits for a round-trip before showing your own words
   * feels broken on a slow connection — and this backend cold-starts.
   */
  const withOptimistic = async (draftMessage, submit) => {
    const tempId = `tmp_${++tempSeq.current}`;
    const optimistic = {
      id: tempId,
      mine: true,
      senderId: myUserId,
      senderName: user?.fullName ?? 'You',
      attachments: [],
      reactions: {},
      replyTo: replyTo ? { id: replyTo.id, name: replyTo.name, text: replyTo.text } : null,
      date: new Date(),
      time: nowClock(),
      createdAt: new Date().toISOString(),
      pending: true,
      failed: false,
      ...draftMessage,
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToEnd();

    try {
      const saved = await submit();
      const real = normalizeMessage(saved, myUserId);
      setMessages((prev) => {
        // The socket may have delivered the same message first; if so, drop the
        // placeholder rather than show it twice.
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
        return [...withoutTemp, real].sort(
          (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
        );
      });
      if (real.createdAt) latestAtRef.current = real.createdAt;
      markRead(threadId, real.id).catch(() => {});
    } catch (e) {
      // Left in place and marked, not removed — it disappearing would lose what
      // the admin wrote without telling them.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m))
      );
      setNotice({ title: 'Message not sent', message: e.message });
    }
  };

  /**
   * Attachments are two calls: upload the bytes, then send a message that
   * references the ids. The optimistic bubble shows the local file throughout,
   * so a photo is visible while it is still uploading.
   */
  const sendAttachment = async (file, uiType, { durationMs } = {}) => {
    if (!threadId) return;
    const replyToMessageId = replyTo?.id ?? null;
    setReplyTo(null);
    await withOptimistic(
      {
        type: uiType,
        text: '',
        uri: file.uri,
        duration: durationMs ? Math.round(durationMs / 1000) : null,
        attachments: [
          {
            id: 'pending',
            type: uiType === 'voice' ? 'AUDIO' : uiType === 'video' ? 'VIDEO' : 'PHOTO',
            uri: file.uri,
            filename: file.name ?? null,
            sizeBytes: 0,
            durationMs: durationMs ?? null,
          },
        ],
      },
      async () => {
        const result = await uploadChatMedia([file], { durationMs });
        const ids = (result?.uploaded ?? []).map((m) => m.id);
        if (ids.length === 0) {
          throw new Error(result?.failed?.[0]?.reason || 'the file could not be uploaded');
        }
        return sendMessage(threadId, { attachmentMediaIds: ids, replyToMessageId });
      }
    );
  };

  // Take a photo with the camera and send it.
  const takePhoto = async () => {
    // The OS pickers can reject outright — no camera, a denied intent, a
    // provider that fails. Unhandled, that rejection kills the handler with
    // only a console warning and the attachment silently never appears.
    try {
      setShowAttach(false);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setNotice({ title: 'Permission needed', message: 'Camera access is required to take a photo.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled) {
        const asset = result.assets[0];
        await sendAttachment({ uri: asset.uri, mimeType: asset.mimeType }, 'image');
      }
    } catch (e) {
      setNotice({ title: 'Could not attach', message: String(e?.message || e) });
    }
  };

  // Pick an image or video from the gallery and send it.
  const pickFromGallery = async () => {
    // The OS pickers can reject outright — no camera, a denied intent, a
    // provider that fails. Unhandled, that rejection kills the handler with
    // only a console warning and the attachment silently never appears.
    try {
      setShowAttach(false);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setNotice({ title: 'Permission needed', message: 'Photo library access is required to attach media.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.7 });
      if (!result.canceled) {
        const asset = result.assets[0];
        const kind = asset.type === 'video' ? 'video' : 'image';
        await sendAttachment(
          { uri: asset.uri, mimeType: asset.mimeType, name: asset.fileName },
          kind
        );
      }
    } catch (e) {
      setNotice({ title: 'Could not attach', message: String(e?.message || e) });
    }
  };

  // Pick a document (PDF / Word / Excel) and send it.
  const pickDocument = async () => {
    // The OS pickers can reject outright — no camera, a denied intent, a
    // provider that fails. Unhandled, that rejection kills the handler with
    // only a console warning and the attachment silently never appears.
    try {
      setShowAttach(false);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      await sendAttachment({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }, 'document');
    } catch (e) {
      setNotice({ title: 'Could not attach', message: String(e?.message || e) });
    }
  };

  const anchoredMessage = messages.find((m) => m.id === anchor?.msgId) || null;

  /**
   * Reacting is a toggle: tapping the emoji already given takes it back. The
   * response carries the whole reaction map, so the bubble updates from the
   * server's count rather than a guess about what everyone else has done.
   */
  const applyReaction = async (emoji) => {
    const target = anchoredMessage;
    setAnchor(null);
    if (!target) return;
    const alreadyMine = (target.reactions?.[emoji] || []).includes(myUserId);
    try {
      const updated = alreadyMine
        ? await removeReaction(target.id, emoji)
        : await addReaction(target.id, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === target.id ? { ...m, reactions: updated?.reactions ?? {} } : m))
      );
    } catch (e) {
      setNotice({ title: 'Could not react', message: e.message });
    }
  };

  // Pick a new emoji: add it to the quick-react list and react with it.
  const pickEmoji = (emoji) => {
    setQuickEmojis((list) => (list.includes(emoji) ? list : [...list, emoji]));
    setShowEmojiPicker(false);
    applyReaction(emoji);
  };

  // Voice recording state.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const dotAnim = useRef(new Animated.Value(1)).current;

  const anchoredMuted = anchoredMessage ? mutedUsers.includes(anchoredMessage.senderId) : false;

  // Options card actions.
  const onMuteOption = () => {
    const target = anchoredMessage;
    setAnchor(null);
    if (target && !target.mine) {
      setMuteTarget({ userId: target.senderId, sender: target.senderName || chatName });
    }
  };
  /** Remove for everyone. Admins may do this to anyone's message — it is the moderation tool. */
  const onDeleteOption = () => {
    const msgId = anchor?.msgId;
    setAnchor(null);
    setDeleteTarget(msgId);
  };
  /** Hide for me — private, and leaves everyone else's copy alone. */
  const onHideOption = async () => {
    const target = anchoredMessage;
    setAnchor(null);
    if (!target) return;
    try {
      await hideMessageForMe(target.id);
      setMessages((prev) => prev.filter((m) => m.id !== target.id));
    } catch (e) {
      setNotice({ title: 'Could not remove', message: e.message });
    }
  };

  const confirmDelete = async () => {
    const msgId = deleteTarget;
    setDeleteTarget(null);
    if (!msgId) return;
    try {
      await deleteMessageForEveryone(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (e) {
      setNotice({ title: 'Could not delete', message: e.message });
    }
  };

  const confirmMute = async () => {
    const target = muteTarget;
    setMuteTarget(null);
    if (!target?.userId) return;
    const currentlyMuted = mutedUsers.includes(target.userId);
    try {
      if (currentlyMuted) {
        await unmuteUser(target.userId);
        setMutedUsers((list) => list.filter((id) => id !== target.userId));
      } else {
        await muteUser(target.userId);
        setMutedUsers((list) => [...list, target.userId]);
      }
    } catch (e) {
      setNotice({ title: 'Could not update', message: e.message });
    }
  };

  // Downloads with the bearer token, then hands the local copy to the OS.
  // Linking.openURL cannot work here: /api/files/** needs authentication and the
  // browser has no session.
  const openDocument = async (attachment) => {
    const result = await openAttachment(attachment);
    if (!result.ok) setNotice({ title: 'Could not open file', message: result.reason });
  };

  // Group messages under day separators (Today / Yesterday / date).
  const dayGroups = [];
  messages.forEach((m) => {
    const day = midnight(m.date || new Date());
    const last = dayGroups[dayGroups.length - 1];
    if (last && sameDay(last.day, day)) last.items.push(m);
    else dayGroups.push({ day, items: [m] });
  });

  // There is no presence on the backend, so claiming "Online" would be a
  // decoration that is wrong most of the time. The directory's own subtitle —
  // "Lead Teacher", "Parent of Amina" — is true and more useful.
  const status = subtitle || (isGroup ? 'Group chat' : 'Direct message');

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
    const text = draft.trim();
    if (!text || !threadId) return;
    const replyToMessageId = replyTo?.id ?? null;
    setDraft('');
    setReplyTo(null);
    withOptimistic({ type: 'text', text }, () =>
      sendMessage(threadId, { body: text, replyToMessageId })
    );
  };

  // Start a WhatsApp-style voice recording.
  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setNotice({ title: 'Permission needed', message: 'Microphone access is required to record voice messages.' });
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      setNotice({ title: 'Recording failed', message: String(e?.message || e) });
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
      await sendAttachment(
        { uri, name: `voice-${Date.now()}.m4a`, mimeType: 'audio/m4a' },
        'voice',
        { durationMs: dur * 1000 }
      );
    }
  };

  const Avatar = ({ size }) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {isGroup ? (
        <GroupUsers width={size * 0.58} height={size * 0.58} />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: size * 0.42 }]}>{initialsOf(chatName)}</Text>
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
            {chatName}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText} numberOfLines={1}>{status}</Text>
          </View>
        </View>
      </View>

      {/* Only shown while messages could actually be missed. */}
      {!connected && !loading && !loadError ? (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>Reconnecting… checking for new messages</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={(w, h) => {
            contentHeightRef.current = h;
            // Only stick to the bottom while nothing older is being prepended —
            // otherwise loading history would yank the view back to the newest
            // message, which is the opposite of what scrolling up asked for.
            if (!loadingOlder) scrollRef.current?.scrollToEnd({ animated: false });
          }}
          onScroll={(e) => {
            if (e.nativeEvent.contentOffset.y <= 24) loadOlder();
          }}
          scrollEventThrottle={64}
        >
          {/* Reaching the top pulls in the previous page. */}
          {loadingOlder ? (
            <View style={styles.olderSpinner}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null}

          {loading ? (
            <View style={styles.centre}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : loadError ? (
            <View style={styles.centre}>
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.centre}>
              <Text style={styles.emptyText}>No messages yet. Say hello to {chatName}.</Text>
            </View>
          ) : (
            dayGroups.map((group) => (
              <View key={group.day.toISOString()} style={styles.dayGroup}>
                <View style={styles.dayPill}>
                  <Text style={styles.dayText}>{dayLabel(group.day)}</Text>
                </View>
                {group.items.map((m) => (
                  <MessageRow
                    key={m.id}
                    m={m}
                    isGroup={isGroup}
                    chatName={chatName}
                    myUserId={myUserId}
                    onReply={onReply}
                    onReact={openReactions}
                    onOpenDoc={openDocument}
                    onOpenMedia={setViewing}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
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
            <Pressable style={styles.attachItem} onPress={pickDocument}>
              <Text style={styles.attachDocGlyph}>📄</Text>
              <Text style={styles.attachLabel}>Document</Text>
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

              {/* Options: reply, remove, and muting the sender */}
              <View style={styles.optionsCard}>
                <Pressable
                  style={styles.optionItem}
                  onPress={() => {
                    if (anchoredMessage) onReply(anchoredMessage);
                    setAnchor(null);
                  }}
                >
                  <Reply width={24} height={24} />
                  <Text style={styles.optionText}>Reply</Text>
                </Pressable>

                {/* Muting yourself would be an odd thing to offer. */}
                {anchoredMessage && !anchoredMessage.mine ? (
                  <Pressable style={styles.optionItem} onPress={onMuteOption}>
                    {anchoredMuted ? <VolumeOn width={24} height={24} /> : <VolumeSlash width={24} height={24} />}
                    <Text style={styles.optionText}>{anchoredMuted ? 'Unmute User' : 'Mute User'}</Text>
                  </Pressable>
                ) : null}

                <Pressable style={styles.optionItem} onPress={onHideOption}>
                  <Trash width={24} height={24} />
                  <Text style={styles.optionText}>Delete for me</Text>
                </Pressable>

                {/* Admins may remove anyone's message — this is the moderation tool. */}
                <Pressable style={styles.optionItem} onPress={onDeleteOption}>
                  <Trash width={24} height={24} />
                  <Text style={[styles.optionText, styles.optionDanger]}>Delete for everyone</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>

      <MediaViewerModal
        visible={!!viewing}
        attachment={viewing}
        onClose={() => setViewing(null)}
      />

      <EmojiPickerModal
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={pickEmoji}
      />

      <DeleteChildModal
        visible={!!deleteTarget}
        title="Delete for everyone?"
        message="This removes the message for every person in this chat. It cannot be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <MuteUserModal
        visible={!!muteTarget}
        muted={muteTarget ? mutedUsers.includes(muteTarget.userId) : false}
        onCancel={() => setMuteTarget(null)}
        onConfirm={confirmMute}
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
  dayGroup: { gap: Spacing.sm + 4 },
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

  optionsCard: {
    marginTop: Spacing.sm,
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
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, height: 40 },
  optionText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },
  optionDanger: { color: Colors.redText },

  // Applied reaction chips on a bubble
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  reactionChipMine: { left: 8 },
  reactionChipTheir: { right: 8 },
  reactionChipText: { fontSize: 14 },
  reactionCount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reactionNum: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.gray },
  // A quiet marker that this reaction is mine — enough to tell at a glance
  // without a second colour scheme for the chip.
  reactionMineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary },

  senderName: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.primaryText,
    marginBottom: 2,
  },
  caption: { marginTop: 4 },
  failedMark: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.redText },

  olderSpinner: { paddingVertical: Spacing.sm, alignItems: 'center' },
  centre: { paddingVertical: 48, alignItems: 'center', gap: Spacing.sm },
  errorText: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.redText, textAlign: 'center' },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, textAlign: 'center' },

  offlineBar: { paddingVertical: 6, paddingHorizontal: Spacing.md, backgroundColor: '#F2F2F2', alignItems: 'center' },
  offlineText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minWidth: 200 },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docExt: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 10, color: Colors.primaryText },
  docMeta: { flex: 1 },
  docName: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textBlack },
  docSize: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.gray },
  attachDocGlyph: { fontSize: 22, width: 24, textAlign: 'center' },

  speedChip: {
    minWidth: 34,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.secStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  speedText: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.gray },
  speedTextOn: { color: Colors.white },

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
