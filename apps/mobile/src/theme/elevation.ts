import { Platform } from 'react-native';

// Design System v2.0's "ambient shadow": stitch's rendered value is
// `box-shadow: 0 4px 20px rgba(0,0,0,0.04)` — very soft, wide-spread, low
// opacity. iOS/Android use native shadow props for the same visual weight;
// web gets an explicit boxShadow (react-native-web deprecates shadow* props
// in favor of it) rather than falling through to an empty default, so the
// web-preview QA harness actually renders the shadow instead of silently
// dropping it.
export const softShadow = Platform.select({
  ios: {
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
  },
  default: {},
});
