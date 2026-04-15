export const LightColors = {
  background: '#FFF8E7',
  primary: '#C8825A',
  primaryLight: '#F0B080',
  secondary: '#6B4C3B',
  accent: '#FFD166',
  success: '#4CAF50',
  danger: '#E74C3C',
  white: '#FFFFFF',
  lightGray: '#F5F0EA',
  gray: '#B0A090',
  darkGray: '#6B5B4E',
  text: '#3D2B1F',
  textLight: '#8C7B6E',
  cardBg: '#FFFDF5',
  shadow: '#C8825A33',
};

export const DarkColors: typeof LightColors = {
  background: '#1A1210',
  primary: '#D4956B',
  primaryLight: '#3D2820',
  secondary: '#F0D5C0',
  accent: '#3D3010',
  success: '#4CAF50',
  danger: '#E74C3C',
  white: '#FFFFFF',
  lightGray: '#2A201A',
  gray: '#6B5B4E',
  darkGray: '#9A8070',
  text: '#F0D5C0',
  textLight: '#8C7B6E',
  cardBg: '#241A14',
  shadow: '#00000066',
};

// Default export kept for screens that don't need dynamic theming (auth/pair)
export const Colors = LightColors;
export type ColorScheme = typeof LightColors;

export const THEME_COLORS = [
  { color: '#C8825A', light: '#F0B080' },  // Brown (default)
  { color: '#7B5EA7', light: '#B09DD0' },  // Purple
  { color: '#2E86C1', light: '#7FB3D3' },  // Blue
  { color: '#1E8449', light: '#7DCEA0' },  // Green
  { color: '#C0392B', light: '#E59E9A' },  // Red
  { color: '#D35400', light: '#E59866' },  // Orange
  { color: '#117A65', light: '#76C6BA' },  // Teal
  { color: '#9B59B6', light: '#D2B4DE' },  // Violet
];
