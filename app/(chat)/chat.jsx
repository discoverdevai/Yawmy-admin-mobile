import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Search from '../../assets/icons/search.svg';
import Broadcast from '../../assets/icons/broadcast.svg';
import GroupUsers from '../../assets/icons/group-users.svg';
import BottomTabBar from '../../components/BottomTabBar';
import { buildChats, initialsOf } from '../../constants/chats';
import { useRooms } from '../../context/RoomsContext';
import { useEnrollment } from '../../context/EnrollmentContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function ChatList() {
  const router = useRouter();
  const { rooms, enrolledTeachers } = useRooms();
  const { parents, staff } = useEnrollment();
  const [query, setQuery] = useState('');

  // Build the threads from the nursery's static data (rooms/parents/teachers/staff).
  const chats = buildChats({ rooms, parents, staff, teachers: enrolledTeachers });

  const q = query.trim().toLowerCase();
  const list = q
    ? chats.filter((c) => c.name.toLowerCase().includes(q) || c.last.toLowerCase().includes(q))
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
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.map((c) => (
          <Pressable
            key={c.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push({ pathname: '/conversation', params: { id: c.id } })}
          >
            <View style={styles.cardLeft}>
              <View style={styles.avatar}>
                {c.type === 'group' ? (
                  <GroupUsers width={28} height={28} />
                ) : (
                  <Text style={styles.avatarInitials}>{initialsOf(c.name)}</Text>
                )}
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.cardLast} numberOfLines={1}>
                  {c.last}
                </Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardTime}>{c.time}</Text>
              {c.unread > 0 && (
                <View style={styles.unread}>
                  <Text style={styles.unreadText}>{c.unread}</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}

        {list.length === 0 && <Text style={styles.empty}>No chats found.</Text>}
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
});
