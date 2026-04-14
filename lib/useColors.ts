import { useAuth } from './auth-context';
import { LightColors, DarkColors } from '@/constants/Colors';
import type { ColorScheme } from '@/constants/Colors';

export function useColors(): ColorScheme {
  const { userProfile } = useAuth();
  return (userProfile?.darkMode ?? false) ? DarkColors : LightColors;
}
