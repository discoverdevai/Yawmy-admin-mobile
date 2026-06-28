import { createContext, useContext, useCallback } from 'react';

const DataContext = createContext(null);

/**
 * App-wide data store for things that aren't auth-related.
 * Add new domains (children, staff, classes, attendance, etc.) here as the
 * app grows.
 */
export function DataProvider({ children }) {
  /** Clear all cached data — call from signOut. */
  const clearData = useCallback(() => {
    // reset cached domains here as they are added
  }, []);

  return (
    <DataContext.Provider
      value={{
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
