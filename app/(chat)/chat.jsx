import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Search from '../../assets/icons/search.svg';
import Broadcast from '../../assets/icons/broadcast.svg';
import GroupUsers from '../../assets/icons/group-users.svg';
import BottomTabBar from '../../components/BottomTabBar';
import { fileHeaders } from '../../config/api';
import { getDirectory } from '../../services/chatService';
import { connectChatSocket } from '../../services/chatSocket';
import { formatChatStamp } from '../../utils/date';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

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

/**
 * A stable key for a directory row. The thread id would be the obvious choice,
 * but rows for people nobody has messaged yet do not have one — and two such
 * rows would then share the key `undefined`.
 */
function chatKey(chat) {
  return chat.threadId || `${chat.kind}:${chat.peerUserId || chat.roomId || 'self'}`;
}

export default function ChatList() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // The admin's list is the whole nursery, derived by the backend from who is
  // currently enrolled — not assembled here from rooms and parents, which could
  // only ever be a guess at the same rules.
  const [chats, setChats] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      setChats(await getDirectory());
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e.message || 'Could not load your chats.');
      setStatus('error');
    }
  }, []);

  // Reloads on every return, so unread counts and previews are current after
  // reading a conversation.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // A message in any thread reorders this list and grows a badge, even when that
  // conversation is not open. One personal queue does that without subscribing
  // to every thread on screen.
  useEffect(() => {
    const socket = connectChatSocket({ onInboxMessage: () => load({ silent: true }) });
    return () => socket.disconnect();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [load]);

  const q = query.trim().toLowerCase();
  const list = q
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.subtitle || '').toLowerCase().includes(q) ||
          (c.preview || '').toLowerCase().includes(q)
      )
    : chats;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <Pressable
          style={({ pressed }) => [styles.broadcastBtn, pressed && styles.pressed]}
          onPress={() => router.push('/broadcast')}
        >
          <Broadcast width={24} height={24} />
          <Text style={styles.broadcastText}>Send Broadcast</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchField}>
          <Search width={24} height={24} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={Colors.gray}
          />
        </View>
      </View>

      {/* Chat list */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {status === 'loading' && chats.length === 0 ? (
          <View style={styles.centre}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : status === 'error' && chats.length === 0 ? (
          <View style={styles.centre}>
            <Text style={styles.empty}>{error}</Text>
            <Pressable onPress={() => load()} hitSlop={8}>
              <Text style={styles.retry}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {list.map((c) => (
              <Pressable
                key={chatKey(c)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() =>
                  router.push({
                    pathname: '/conversation',
                    params: {
                      // A row with no thread yet has no id to pass, so the
                      // conversation screen is handed the row and opens it.
                      threadId: c.threadId ?? '',
                      kind: c.kind,
                      peerUserId: c.peerUserId ?? '',
                      roomId: c.roomId ?? '',
                      name: c.title,
                      subtitle: c.subtitle,
                      avatarUrl: c.avatarUrl ?? '',
                    },
                  })
                }
              >
                <View style={styles.cardLeft}>
                  {c.isGroup ? (
                    <View style={styles.avatar}>
                      <GroupUsers width={28} height={28} />
                    </View>
                  ) : c.avatarUrl ? (
                    <Image
                      source={{ uri: c.avatarUrl, headers: fileHeaders() }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitials}>{initialsOf(c.title)}</Text>
                    </View>
                  )}
                  <View style={styles.cardText}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {c.title}
                    </Text>
                    {/* No conversation yet means no preview, so who they are —
                        "Lead Teacher", "Parent of Amina" — stands in for it. */}
                    <Text
                      style={[styles.cardLast, !c.preview && styles.cardSubtitle]}
                      numberOfLines={1}
                    >
                      {c.preview || c.subtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardTime}>{formatChatStamp(c.lastMessageAt)}</Text>
                  {c.unread > 0 && (
                    <View style={styles.unread}>
                      <Text style={styles.unreadText}>{c.unread > 99 ? '99+' : c.unread}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}

            {list.length === 0 && (
              <Text style={styles.empty}>
                {query ? `No chats match “${query}”.` : 'No chats yet.'}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <BottomTabBar active="chat" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pressed: { opacity: 0.85 },
  broadcastText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.primary },

  searchWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  searchInput: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  list: { paddingHorizontal: Spacing.md, paddingBottom: 110 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  cardPressed: { opacity: 0.7 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 18, color: Colors.primaryText },
  cardText: { flex: 1, gap: Spacing.sm },
  cardName: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  cardLast: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },
  // Standing in for a preview that does not exist yet — set apart from a real
  // last message so the list still reads as "nothing has been said here".
  cardSubtitle: { fontStyle: 'italic', opacity: 0.75 },

  cardRight: { alignItems: 'flex-end', gap: Spacing.sm },
  cardTime: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  unread: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.white },

  empty: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray, marginTop: Spacing.lg },
  centre: { paddingVertical: 48, alignItems: 'center', gap: Spacing.sm },
  retry: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 14, color: Colors.primary },
});
