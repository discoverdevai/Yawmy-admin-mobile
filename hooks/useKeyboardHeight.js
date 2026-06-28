import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Tracks the on-screen keyboard height (0 when hidden).
 * Works regardless of the Android windowSoftInputMode, so it's reliable even
 * with edge-to-edge where the window doesn't resize for the keyboard.
 */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setHeight(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
