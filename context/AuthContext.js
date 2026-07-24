import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';
import { setTokenGetter } from '../config/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true while restoring session

  const tokenRef = useRef(token);
  tokenRef.current = token;

  // This device's refresh token. Kept in a ref (not state) because it is only
  // ever read imperatively — it identifies this session to /auth/logout so we
  // can sign out this device without touching the user's other devices.
  const refreshRef = useRef(null);

  // Wire up the api token getter once
  useEffect(() => {
    setTokenGetter(() => tokenRef.current);
  }, []);

  // Restore persisted session on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser, savedRefresh] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(REFRESH_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        }
        refreshRef.current = savedRefresh || null;
      } catch (_) {
        // ignore storage errors on restore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Establish a session from a token pair. Used both by normal login and by the
  // invite flow (accept-invite also returns a pair). Persists the tokens, then
  // loads the profile from GET /auth/me.
  const activateSession = useCallback(async (accessToken, refreshToken) => {
    tokenRef.current = accessToken; // set immediately so getProfile() carries it
    setToken(accessToken);
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);

    if (refreshToken) {
      refreshRef.current = refreshToken;
      await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
    }

    const me = await authService.getProfile();
    setUser(me);
    setIsAuthenticated(true);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
    return me;
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      // Backend returns { accessToken, refreshToken, tokenType, expiresInSeconds }.
      const { accessToken, refreshToken } = await authService.signIn(email, password);
      if (!accessToken) throw new Error('Login failed');
      return activateSession(accessToken, refreshToken);
    },
    [activateSession]
  );

  // Wipe local session state. Shared by both sign-out paths.
  const clearSession = useCallback(async () => {
    tokenRef.current = null; // clear immediately so API doesn't send a stale token
    refreshRef.current = null;
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  }, []);

  /** Sign out this device only — the user's other devices stay signed in. */
  const signOut = useCallback(async () => {
    try {
      // Called before clearing, while the access token is still available.
      await authService.signOut(refreshRef.current);
    } catch (_) {
      // Never trap the user in the app if the call fails — clear locally anyway.
    }
    await clearSession();
  }, [clearSession]);

  /** Sign out everywhere — revokes every session for this user. */
  const signOutAll = useCallback(async () => {
    try {
      await authService.signOutAll();
    } catch (_) {
      // best-effort, same reasoning as signOut
    }
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
        signOutAll,
        activateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
