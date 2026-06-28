import { createContext, useContext, useRef, useState } from 'react';
import { EVENTS as SEED } from '../constants/events';

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
  const [events, setEvents] = useState(SEED);
  const nextId = useRef(SEED.length + 1);

  // Add a new event to the top of the list, returns its id.
  const addEvent = (event) => {
    const id = String(nextId.current++);
    setEvents((list) => [{ id, ...event }, ...list]);
    return id;
  };

  const deleteEvent = (id) => setEvents((list) => list.filter((e) => e.id !== id));

  const updateEvent = (id, patch) =>
    setEvents((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  return (
    <EventsContext.Provider value={{ events, addEvent, deleteEvent, updateEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return ctx;
}
