import { Platform, useWindowDimensions } from 'react-native';
import { breakpoints } from './theme';

// Desktop = wide web viewport. Native apps always get the mobile experience.
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= breakpoints.lg;
}

export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoints.md;
}
