import { createContext, useContext, useState } from 'react';

const SetupContext = createContext(null);

/**
 * Shared state for the 3-step nursery setup wizard so each step can read the
 * values entered in the previous ones.
 */
export function SetupProvider({ children }) {
  const [nurseryName, setNurseryName] = useState('');
  const [logo, setLogo] = useState(null);
  const [location, setLocation] = useState(null); // { center: [lng, lat], placeName }
  const [radius, setRadius] = useState(100); // meters
  const [days, setDays] = useState([]); // e.g. ['Sunday', 'Monday']
  const [hours, setHours] = useState({
    from: { hour: 8, minute: 0, period: 'AM' },
    to: { hour: 12, minute: 0, period: 'PM' },
  });

  return (
    <SetupContext.Provider
      value={{
        nurseryName,
        setNurseryName,
        logo,
        setLogo,
        location,
        setLocation,
        radius,
        setRadius,
        days,
        setDays,
        hours,
        setHours,
      }}
    >
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  const ctx = useContext(SetupContext);
  if (!ctx) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return ctx;
}
