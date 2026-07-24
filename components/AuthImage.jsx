import { Image } from 'expo-image';
import { useAuth } from '../context/AuthContext';
import { fileUrl } from '../config/api';

/**
 * Renders an image served by an auth-protected backend endpoint (nursery logo,
 * child photo, media). Attaches the Bearer token to the request; falls back to
 * `fallback` (a local require(...)) when `path` is empty.
 *
 * @param {string} path      backend file path, e.g. "/api/files/nursery/{id}/logo"
 * @param {*}      fallback  local image source used when there is no path
 */
export default function AuthImage({ path, fallback, style, contentFit = 'cover' }) {
  const { token } = useAuth();
  const source = path
    ? { uri: fileUrl(path), headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    : fallback;
  return <Image source={source} style={style} contentFit={contentFit} />;
}
