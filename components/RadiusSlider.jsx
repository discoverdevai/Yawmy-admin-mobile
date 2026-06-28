import { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { Colors, Radii } from '../constants/theme';

/**
 * Discrete slider that snaps to a fixed set of stops (e.g. 50 / 100 / 200).
 * Pure RN (PanResponder) so it needs no extra native dependency.
 *
 * Uses the touch's absolute pageX minus the track's measured window position,
 * so every stop (including the middle) is reachable regardless of which inner
 * view the finger is over.
 */
export default function RadiusSlider({ values, value, onChange }) {
  const trackRef = useRef(null);
  const box = useRef({ x: 0, width: 0 });
  const [width, setWidth] = useState(0);

  const lastIndex = values.length - 1;
  const index = Math.max(0, values.indexOf(value));
  const pos = lastIndex === 0 ? 0 : (index / lastIndex) * width;

  const pickFromPageX = (pageX) => {
    const { x, width: w } = box.current;
    if (!w) return;
    const ratio = Math.min(1, Math.max(0, (pageX - x) / w));
    const i = Math.round(ratio * lastIndex);
    onChange(values[i]);
  };

  const measure = () => {
    trackRef.current?.measureInWindow((x, y, w) => {
      box.current = { x, width: w };
      setWidth(w);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pickFromPageX(e.nativeEvent.pageX),
      onPanResponderMove: (e) => pickFromPageX(e.nativeEvent.pageX),
    })
  ).current;

  return (
    <View
      ref={trackRef}
      style={styles.wrapper}
      onLayout={measure}
      {...panResponder.panHandlers}
    >
      <View style={styles.track} />
      <View style={[styles.fill, { width: pos }]} />
      <View style={[styles.thumb, { left: pos - 12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 24,
    justifyContent: 'center',
  },
  track: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.tapsBg,
  },
  fill: {
    position: 'absolute',
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
