import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import AnnounceDoc from '../../assets/icons/announce-doc.svg';
import FileDoc from '../../assets/icons/file-doc.svg';
import LinkIcon from '../../assets/icons/link.svg';
import EyeSeen from '../../assets/icons/eye-seen.svg';
import AuthImage from '../../components/AuthImage';
import DeleteChildModal from '../../components/DeleteChildModal';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { getAnnouncement, deleteAnnouncement } from '../../services/announcementService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const deleteIllustration = require('../../assets/images/delete-announcement.png');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2024-03-30" -> "Mar 30"
const fmtDate = (s) => {
  if (!s) return '';
  const [, m, d] = s.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${d}` : '';
};
// "22:30:00" -> "10:30 PM"
const fmtTime = (s) => {
  if (!s) return '';
  const [hh, mm] = s.split(':').map(Number);
  if (Number.isNaN(hh)) return '';
  const period = hh < 12 ? 'AM' : 'PM';
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${period}`;
};

// A short filename-ish label for a document attachment (backend has no original name).
const DOC_EXT = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
};
const docLabel = (att) => `Attachment.${(DOC_EXT[att.contentType] || 'FILE').toLowerCase()}`;

export default function AnnouncementDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnnouncement(id);
      setItem(data);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the announcement.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/announcements');
  };

  // Confirm deletion: remove the announcement via the API, then show the success modal.
  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(id);
      setShowDelete(false);
      setShowSuccess(true);
    } catch (e) {
      setShowDelete(false);
      setError(e.message || 'Could not delete the announcement.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const target = item?.scope === 'NURSERY' ? 'Nursery-Wide' : (item?.roomName || 'Room-targeted');
  const when = [fmtDate(item?.announcementDate), fmtTime(item?.announcementTime)]
    .filter(Boolean)
    .join(' - ');
  const attachments = item?.attachments || [];
  const visuals = attachments.filter((a) => a.type === 'PHOTO' || a.type === 'VIDEO');
  const docs = attachments.filter((a) => a.type === 'DOCUMENT');
  const links = item?.links || [];
  const hasAttachments = visuals.length > 0 || docs.length > 0 || links.length > 0;

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

      {item && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Meta card */}
          <View style={styles.metaCard}>
            <View style={styles.metaIcon}>
              <AnnounceDoc width={24} height={24} />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaShare}>{target}</Text>
              {!!when && <Text style={styles.metaDate}>{when}</Text>}
            </View>
            <View style={styles.viewsBadge}>
              <EyeSeen width={16} height={16} />
              <Text style={styles.viewsText}>{item.seenCount ?? 0}</Text>
            </View>
          </View>

          {/* Title + description */}
          <View style={styles.body}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.body}</Text>
          </View>

          {/* Attachments */}
          {hasAttachments && (
            <View style={styles.attachments}>
              <Text style={styles.attachLabel}>Attachments</Text>

              {visuals.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.visualRow}
                >
                  {visuals.map((att) =>
                    att.type === 'PHOTO' ? (
                      <AuthImage key={att.id} path={att.fileUrl} style={styles.visual} contentFit="cover" />
                    ) : (
                      <View key={att.id} style={[styles.visual, styles.videoTile]}>
                        <View style={styles.playCircle}>
                          <Text style={styles.playIcon}>{'▶'}</Text>
                        </View>
                      </View>
                    )
                  )}
                </ScrollView>
              )}

              {docs.map((att) => (
                <View key={att.id} style={styles.docRow}>
                  <FileDoc width={24} height={24} />
                  <Text style={styles.docName} numberOfLines={1}>
                    {docLabel(att)}
                  </Text>
                </View>
              ))}

              {links.map((url, i) => (
                <Pressable
                  key={`${url}-${i}`}
                  style={styles.linkRow}
                  onPress={() => Linking.openURL(/^https?:\/\//i.test(url) ? url : `https://${url}`)}
                >
                  <LinkIcon width={24} height={24} />
                  <Text style={styles.linkText} numberOfLines={1}>
                    {url}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Footer */}
      {item && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            onPress={() => setShowDelete(true)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/add-announcement', params: { id } })}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
      )}

      <DeleteChildModal
        visible={showDelete}
        image={deleteIllustration}
        title="Delete This Announcement?"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        onCancel={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />

      <SuccessModal
        visible={showSuccess}
        title="Announcement Deleted Successfully!"
        message="The announcement has been removed and is no longer visible."
        buttonText="Back to Announcements"
        onContinue={() => {
          setShowSuccess(false);
          router.replace('/announcements');
        }}
      />

      <ErrorModal
        visible={!!error && !loading}
        title="Something went wrong"
        message={error}
        buttonText="OK"
        onClose={() => {
          const wasLoadError = !item;
          setError(null);
          if (wasLoadError) goBack();
        }}
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
  visual: { width: 159, height: 112, borderRadius: Radii.button, backgroundColor: Colors.secStroke },
  videoTile: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F1F1F' },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 16, color: Colors.textBlack, marginLeft: 2 },

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
