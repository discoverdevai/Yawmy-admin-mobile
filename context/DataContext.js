import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getNursery } from '../services/nurseryService';

const DataContext = createContext(null);

/**
 * App-wide data store for things that aren't auth-related.
 * Currently holds the current admin's nursery (name + logo) so any screen
 * (home header, profile, …) can read it without re-fetching.
 */
export function DataProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [nursery, setNursery] = useState(null);
  const [loadingNursery, setLoadingNursery] = useState(false);
  // The backend serves the logo from a stable path (/api/files/nursery/{id}/logo),
  // so a re-upload doesn't change the URL and expo-image keeps serving the old
  // cached image. Bumping this appends a fresh query param to break that cache.
  const [logoVersion, setLogoVersion] = useState(0);

  const refreshNursery = useCallback(async () => {
    setLoadingNursery(true);
    try {
      const n = await getNursery();
      setNursery(n);
      return n;
    } finally {
      setLoadingNursery(false);
    }
  }, []);

  // Call after a successful logo upload so every screen picks up the new image
  // instead of the cached one.
  const bumpLogoVersion = useCallback(() => setLogoVersion((v) => v + 1), []);

  // Load the nursery when the session becomes authenticated; clear on logout.
  useEffect(() => {
    if (isAuthenticated) {
      refreshNursery().catch(() => {});
    } else {
      setNursery(null);
      setLogoVersion(0);
    }
  }, [isAuthenticated, refreshNursery]);

  const clearData = useCallback(() => {
    setNursery(null);
    setLogoVersion(0);
  }, []);

  const logoUrl = nursery?.logoUrl
    ? logoVersion > 0
      ? `${nursery.logoUrl}?v=${logoVersion}`
      : nursery.logoUrl
    : null;

  return (
    <DataContext.Provider
      value={{
        nursery,
        nurseryName: nursery?.name || '',
        logoUrl,
        loadingNursery,
        refreshNursery,
        bumpLogoVersion,
        clearData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
