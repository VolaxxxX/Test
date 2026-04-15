import { useAuth } from './auth-context';
import { LightColors, DarkColors, THEME_COLORS } from '@/constants/Colors';
import type { ColorScheme } from '@/constants/Colors';

export function useColors(): ColorScheme {
  const { userProfile } = useAuth();
  const base = (userProfile?.darkMode ?? false) ? DarkColors : LightColors;
  if (userProfile?.themeColor) {
    const pair = THEME_COLORS.find(t => t.color === userProfile.themeColor);
    if (pair) return { ...base, primary: pair.color, primaryLight: pair.light };
  }
  return base;
}
