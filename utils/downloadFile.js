import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Download a file from an auth-protected backend URL and hand it to the system
 * share sheet (where the user can "Save to Files" / Downloads). Returns true on
 * success.
 *
 * @param {string} url       absolute backend URL
 * @param {string} filename  e.g. "child-records.xlsx"
 * @param {string} mimeType  e.g. the XLSX mime type
 * @param {string} [token]   Bearer token attached as Authorization
 */
export async function downloadAndShare(url, filename, mimeType, token) {
  try {
    const fileUri = FileSystem.cacheDirectory + filename;
    const res = await FileSystem.downloadAsync(url, fileUri, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.status !== 200) {
      throw new Error(`Download failed (${res.status})`);
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(res.uri, { mimeType, dialogTitle: filename, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
    }
    return true;
  } catch (e) {
    Alert.alert('Export failed', String(e?.message || e));
    return false;
  }
}
