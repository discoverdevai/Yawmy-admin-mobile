import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import AnnounceDoc from '../../assets/icons/announce-doc.svg';
import FileDoc from '../../assets/icons/file-doc.svg';
import LinkIcon from '../../assets/icons/link.svg';
import AuthImage from '../../components/AuthImage';
import SuccessModal from '../../components/SuccessModal';
import ErrorModal from '../../components/ErrorModal';
import { submitAnnouncementUpdate, submitAnnouncementCreate } from '../../services/announcementService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOC_EXT = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
};

const fmtNow = () => {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()} - ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const isImage = (m) => (m.mimeType || '').startsWith('image/') || m.type === 'PHOTO';
const isVideo = (m) => (m.mimeType || '').startsWith('video/') || m.type === 'VIDEO';
const mediaName = (m) => m.name || `Attachment.${(DOC_EXT[m.mimeType] || 'FILE').toLowerCase()}`;

export default function AnnouncementPreview() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let data = {};
  try {
    data = params.data ? JSON.parse(params.data) : {};
  } catch {
    data = {};
  }
  const {
    id = null,
    editing = false,
    name = '',
    description = '',
    announcementDate = null,
    announcementTime = null,
    media = [],
    links = [],
    shareWith,
    roomName,
    roomId = null,
    whenLabel,
  } = data;

  const visuals = media.filter((m) => isImage(m) || isVideo(m));
  const docs = media.filter((m) => !isImage(m) && !isVideo(m));
  const shareLabel = shareWith === 'nursery' ? 'Nursery-Wide' : roomName || 'Room-targeted';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-dismiss the success popup and return to the announcements list.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => router.dismissTo('/announcements'), 1600);
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/add-announcement');
  };

  const scopeApi = shareWith === 'room' ? 'ROOM' : 'NURSERY';

  const publish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing && id) {
        await submitAnnouncementUpdate(id, {
          title: name,
          body: description,
          announcementDate,
          announcementTime,
          links,
          scope: scopeApi,
          roomId,
          keptMediaIds: media.filter((m) => m.existingId).map((m) => m.existingId),
          newMedia: media
            .filter((m) => !m.existingId)
            .map((m) => ({ uri: m.uri, name: m.name, mimeType: m.mimeType })),
        });
      } else {
        await submitAnnouncementCreate({
          title: name,
          body: description,
          announcementDate,
          announcementTime,
          links,
          scope: scopeApi,
          roomId,
          newMedia: media.map((m) => ({ uri: m.uri, name: m.name, mimeType: m.mimeType })),
        });
      }
      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not publish the announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Announcements Preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meta card */}
        <View style={styles.metaCard}>
          <View style={styles.metaIcon}>
            <AnnounceDoc width={24} height={24} />
          </View>
          <View style={styles.metaText}>
            <Text style={styles.metaShare}>{shareLabel}</Text>
            <Text style={styles.metaDate}>{whenLabel || fmtNow()}</Text>
          </View>
        </View>

        {/* Title + description */}
        <View style={styles.body}>
          <Text style={styles.title}>{name || 'Announcement title'}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Attachments */}
        {(visuals.length > 0 || docs.length > 0 || links.length > 0) && (
          <View style={styles.attachments}>
            <Text style={styles.attachLabel}>Attachments</Text>

            {/* Images / videos — horizontal scroller */}
            {visuals.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.visualRow}
              >
                {visuals.map((m, i) => {
                  const key = m.key || m.uri || m.existingId || i;
                  if (isImage(m)) {
                    return m.existingId ? (
                      <AuthImage key={key} path={m.fileUrl} style={styles.visual} contentFit="cover" />
                    ) : (
                      <Image key={key} source={{ uri: m.uri }} style={styles.visual} contentFit="cover" />
                    );
                  }
                  return (
                    <View key={key} style={[styles.visual, styles.videoTile]}>
                      <Text style={styles.videoText} numberOfLines={2}>
                        {mediaName(m)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Documents */}
            {docs.map((m, i) => (
              <View key={m.key || m.existingId || i} style={styles.docRow}>
                <FileDoc width={24} height={24} />
                <Text style={styles.docName} numberOfLines={1}>
                  {mediaName(m)}
                </Text>
              </View>
            ))}

            {/* Links */}
            {links.map((url, i) => (
              <View key={`${url}-${i}`} style={styles.linkRow}>
                <LinkIcon width={24} height={24} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {url}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          onPress={publish}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.ctaText}>Publish</Text>}
        </Pressable>
      </View>

      <SuccessModal
        visible={showSuccess}
        title="Announcement Shared Successfully!"
        message=""
        buttonText=""
      />

      <ErrorModal
        visible={!!error}
        title="Something went wrong"
        message={error}
        buttonText="OK"
        onClose={() => setError(null)}
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

  body: { paddingHorizontal: Spacing.md, gap: Spacing.sm + 4 },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  description: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.gray, lineHeight: 24 },

  attachments: { paddingHorizontal: Spacing.md, gap: Spacing.md, marginTop: Spacing.xs },
  attachLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },

  visualRow: { gap: Spacing.sm },
  visual: { width: 159, height: 112, borderRadius: Radii.button, backgroundColor: Colors.secStroke },
  videoTile: { backgroundColor: Colors.textBlack, alignItems: 'center', justifyContent: 'center', padding: Spacing.sm },
  videoText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.white, textAlign: 'center' },

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

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
