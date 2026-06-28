import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import AnnounceDoc from '../../assets/icons/announce-doc.svg';
import FileDoc from '../../assets/icons/file-doc.svg';
import LinkIcon from '../../assets/icons/link.svg';
import EyeSeen from '../../assets/icons/eye-seen.svg';
import DeleteChildModal from '../../components/DeleteChildModal';
import { useAnnouncements } from '../../context/AnnouncementsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function AnnouncementDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { announcements, deleteAnnouncement } = useAnnouncements();
  const [showDelete, setShowDelete] = useState(false);

  const item = announcements.find((a) => a.id === id) || announcements[0];
  const { title, body, date, views, scope, images = [], file, link } = item;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/announcements');
  };

  // Confirm deletion: remove the announcement and return to the list.
  const confirmDelete = () => {
    setShowDelete(false);
    deleteAnnouncement(item.id);
    router.replace('/announcements');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Announcements Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meta card */}
        <View style={styles.metaCard}>
          <View style={styles.metaIcon}>
            <AnnounceDoc width={24} height={24} />
          </View>
          <View style={styles.metaText}>
            <Text style={styles.metaShare}>{scope === 'nursery' ? 'Nursery-Wide' : 'Room-targeted'}</Text>
            <Text style={styles.metaDate}>{date}</Text>
          </View>
          <View style={styles.viewsBadge}>
            <EyeSeen width={16} height={16} />
            <Text style={styles.viewsText}>{views}</Text>
          </View>
        </View>

        {/* Title + description */}
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{body}</Text>
        </View>

        {/* Attachments */}
        {(images.length > 0 || file || link) && (
          <View style={styles.attachments}>
            <Text style={styles.attachLabel}>Attachments</Text>

            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.visualRow}
              >
                {images.map((src, i) => (
                  <Image key={i} source={src} style={styles.visual} contentFit="cover" />
                ))}
              </ScrollView>
            )}

            {!!file && (
              <View style={styles.docRow}>
                <FileDoc width={24} height={24} />
                <Text style={styles.docName} numberOfLines={1}>
                  {file}
                </Text>
              </View>
            )}

            {!!link && (
              <View style={styles.linkRow}>
                <LinkIcon width={24} height={24} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {link}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
          onPress={() => setShowDelete(true)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/add-announcement', params: { id: item.id } })}
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      <DeleteChildModal
        visible={showDelete}
        title="Delete This Announcement?"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  content: { paddingBottom: Spacing.lg, gap: Spacing.md },

  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: Colors.tapsBg,
  },
  metaIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primaryBgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: { flex: 1, gap: Spacing.sm },
  metaShare: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.gray },
  metaDate: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 14, color: Colors.textBlack },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.button,
  },
  viewsText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: '#247400' },

  body: { paddingHorizontal: Spacing.md, gap: Spacing.sm + 4 },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  description: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.gray, lineHeight: 24 },

  attachments: { paddingHorizontal: Spacing.md, gap: Spacing.md, marginTop: Spacing.xs },
  attachLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  visualRow: { gap: Spacing.sm },
  visual: { width: 159, height: 112, borderRadius: Radii.button },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  docName: { flex: 1, fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.textBlack },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  linkText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.primaryText,
    textDecorationLine: 'underline',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.lightRedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.redText },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
