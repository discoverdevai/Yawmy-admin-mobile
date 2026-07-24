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

  // Load the nursery when the session becomes authenticated; clear on logout.
  useEffect(() => {
    if (isAuthenticated) {
      refreshNursery().catch(() => {});
    } else {
      setNursery(null);
    }
  }, [isAuthenticated, refreshNursery]);

  const clearData = useCallback(() => {
    setNursery(null);
  }, []);

  return (
    <DataContext.Provider
      value={{
        nursery,
        nurseryName: nursery?.name || '',
        logoUrl: nursery?.logoUrl || null,
        loadingNursery,
        refreshNursery,
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
