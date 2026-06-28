import { Platform } from 'react-native';

// Yawmy Care — Design Tokens (from Figma)

export const Colors = {
  // Primary
  primary: '#76945C', // primary/CTAprimarycolor
  primaryText: '#334722', // primary/textColor — dark green (map pin)
  primaryBg: '#DFEBD1', // primary/bgColor — profile card
  accentText: '#B5503C', // Accent/textColor — sign out
  lightGreen: '#F0FDE9', // bg/lightgreenColor
  primaryBgLight: '#F8FAEE', // primary/bglightColor — open dropdown bg
  accent: '#E2725B', // AccentColor/main
  accentBgLight: '#FEF8ED', // AccentColor/bglightcolor
  accentSecBg: '#FFEFEC', // Accent/secbgColor
  accentStroke: '#FFCCC1', // stroke/accentColor
  secStroke: '#F5F5DC', // sec/strokeColor — tab bar, chips
  // Text
  textBlack: '#333333', // text/blackColor
  gray: '#535353', // text/grayColor
  secGray: '#535353',
  lightGray: '#D9D9D9',
  stroke: '#D8D8D8', // stroke/grayColor — input borders
  disabledButton: '#D5D4D4',
  // Surfaces
  background: '#FFFFF5', // bg/whiteColor
  secBg: '#FCFCEC', // bg/secColor — time picker cells
  secBorder: '#E9E9CC', // time picker cell border
  tapsBg: '#F3F5E8', // bg/tapsColor — inactive stepper segments
  white: '#FEFEFE', // text/whitecolor
  placeholder: '#D9D9D9',
  black: '#000000',
  // Status
  error: '#D32F2F',
  errorRed: '#C20A0A',
  redText: '#C90101', // text/redcolor
  lightRed: '#FFF7F7',
  lightRedBg: '#FFF6F6', // bg/lightredcolor — error input bg
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// The design uses "Recoleta" (Bold / Medium) — a paid serif not on Google
// Fonts. Until the Recoleta font files are added to assets/fonts and loaded
// in app/_layout.jsx, fall back to a system serif so the type still reads
// as the intended serif. Swap these values to 'Recoleta' once loaded.
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export const Fonts = {
  // serif (Recoleta) — used for headings, body and buttons in this design
  bold: SERIF,
  medium: SERIF,
  regular: SERIF,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  button: 20,
  card: 40,
  full: 9999,
};

export const InputHeight = 48;

// React Native Paper MD3 custom theme
export const paperTheme = {
  colors: {
    primary: Colors.primary,
    onPrimary: Colors.white,
    primaryContainer: '#E8F0E0',
    onPrimaryContainer: Colors.primary,
    secondary: Colors.primary,
    onSecondary: Colors.white,
    background: Colors.background,
    onBackground: Colors.textBlack,
    surface: Colors.white,
    onSurface: Colors.textBlack,
    surfaceVariant: '#F5F5F0',
    onSurfaceVariant: Colors.gray,
    outline: Colors.lightGray,
    error: Colors.error,
    onError: Colors.white,
  },
};
