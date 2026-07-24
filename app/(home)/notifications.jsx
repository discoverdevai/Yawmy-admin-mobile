import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import BellOutline from '../../assets/icons/notification.svg';
import BellFilled from '../../assets/icons/bell-filled.svg';
import { useNotifications } from '../../context/NotificationsContext';
import { Colors, Fonts, Spacing } from '../../constants/theme';

const emptyImage = require('../../assets/images/notifications-empty.png');

export default function Notifications() {
  const router = useRouter();
  const { items, markRead, markAllRead, deleteAll, refresh } = useNotifications();

  // Refresh the list whenever the screen opens.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const isEmpty = items.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Notification</Text>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Image source={emptyImage} style={styles.emptyImage} contentFit="contain" />
          <View style={styles.emptyText}>
            <Text style={styles.emptyTitle}>Nothing here yet!</Text>
            <Text style={styles.emptySubtitle}>
              we’ll notify you when there are notifications.
            </Text>
          </View>
        </View>
      ) : (
        <>
          {/* Actions */}
          <View style={styles.actions}>
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text style={styles.markRead}>Mark As Read</Text>
            </Pressable>
            <Pressable onPress={deleteAll} hitSlop={8} style={styles.deleteBtn}>
              <Text style={styles.deleteAll}>Delete All</Text>
            </Pressable>
          </View>

          {/* List — tapping an unread one marks it read */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.item, !n.read && styles.itemUnread]}
                onPress={() => {
                  if (!n.read) markRead(n.id);
                }}
              >
                {n.read ? (
                  <BellOutline width={24} height={24} />
                ) : (
                  <BellFilled width={24} height={24} />
                )}
                <View style={styles.itemBody}>
                  {!!n.title && <Text style={styles.itemTitle}>{n.title}</Text>}
                  {!!n.body && <Text style={styles.itemText}>{n.body}</Text>}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  markRead: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: '#121212',
  },
  deleteBtn: { height: 40, justifyContent: 'center' },
  deleteAll: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.primary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secStroke,
  },
  itemUnread: { backgroundColor: Colors.accentBgLight },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.textBlack,
  },
  itemText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  emptyImage: { width: '100%', maxWidth: 343, aspectRatio: 1 },
  emptyText: { alignItems: 'center', gap: Spacing.sm, maxWidth: 276 },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    textAlign: 'center',
  },
});
