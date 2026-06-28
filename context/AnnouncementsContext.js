import { createContext, useContext, useState } from 'react';
import { ANNOUNCEMENTS as SEED } from '../constants/announcements';

const AnnouncementsContext = createContext(null);

export function AnnouncementsProvider({ children }) {
  const [announcements, setAnnouncements] = useState(SEED);

  const deleteAnnouncement = (id) =>
    setAnnouncements((list) => list.filter((a) => a.id !== id));

  return (
    <AnnouncementsContext.Provider value={{ announcements, deleteAnnouncement }}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementsContext);
  if (!ctx) {
    throw new Error('useAnnouncements must be used within an AnnouncementsProvider');
  }
  return ctx;
}
