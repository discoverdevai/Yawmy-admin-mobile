import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useAuth } from '../context/AuthContext';
import { fileUrl } from '../config/api';

/**
 * Renders an image served by an auth-protected backend endpoint (nursery logo,
 * child photo, media). Attaches the Bearer token to the request; falls back to
 * `fallback` (a local require(...)) when `path` is empty OR when the remote
 * image cannot be fetched.
 *
 * The second case matters: the backend derives these URLs from a stored key
 * without checking the file is still on disk, so a path can be present and the
 * request still 404. Without the onError branch expo-image renders an empty
 * box, which reads as a broken layout rather than a missing photo.
 *
 * @param {string} path      backend file path, e.g. "/api/files/nursery/{id}/logo"
 * @param {*}      fallback  local image source used when there is no path
 */
export default function AuthImage({ path, fallback, style, contentFit = 'cover' }) {
  const { token } = useAuth();
  const uri = fileUrl(path);
  const [failed, setFailed] = useState(false);

  // Retry on a new url, and on a new token: the first paint can happen before
  // the session has hydrated, and that unauthenticated attempt must not pin the
  // image to the fallback for the rest of the screen's life.
  useEffect(() => setFailed(false), [uri, token]);

  const source =
    uri && !failed
      ? { uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      : fallback;

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      onError={() => setFailed(true)}
    />
  );
}
