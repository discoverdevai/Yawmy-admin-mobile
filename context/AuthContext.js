import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/authService';
import { setTokenGetter } from '../config/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true while restoring session

  const tokenRef = useRef(token);
  tokenRef.current = token;

  // Wire up the api token getter once
  useEffect(() => {
    setTokenGetter(() => tokenRef.current);
  }, []);

  // Restore persisted session on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        }
      } catch (_) {
        // ignore storage errors on restore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const response = await authService.signIn(email, password);

    if (!response.success) {
      throw new Error(response.message || 'Login failed');
    }

    const { token: newToken, ...userData } = response.data;

    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

    tokenRef.current = newToken; // set immediately so next API call has the token
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);

    return response;
  }, []);

  const signOut = useCallback(async () => {
    tokenRef.current = null; // clear immediately so API doesn't send stale token
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
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
