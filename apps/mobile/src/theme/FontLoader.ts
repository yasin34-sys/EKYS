import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Gates rendering until Inter is actually loaded — avoids a flash of
// the platform default font (Roboto/San Francisco) before swapping,
// which would undercut the whole point of loading a custom typeface.
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  return loaded;
}
