import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Write a CSV string and save it onto the phone.
 *
 * - Android: saves the file directly into a folder the user picks (e.g.
 *   Downloads) using the Storage Access Framework — a real "download".
 * - iOS (or if Android folder access is denied): opens the system share sheet,
 *   where the user can choose "Save to Files".
 *
 * Returns true on success.
 */
export async function downloadCsv(filename, content) {
  try {
    if (Platform.OS === 'android') {
      const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (perm.granted) {
        const base = filename.replace(/\.csv$/i, '');
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perm.directoryUri,
          base,
          'text/csv'
        );
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        return true;
      }
      // Folder access denied → fall through to the share sheet.
    }

    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: filename,
        UTI: 'public.comma-separated-values-text',
      });
    }
    return true;
  } catch (e) {
    Alert.alert('Export failed', String(e?.message || e));
    return false;
  }
}
