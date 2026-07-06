import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, type ViewStyle } from 'react-native';
import { confidentEase } from '../theme';

export interface FadeInUpProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Milliseconds to wait before starting — lets a screen stagger entrances. */
  delay?: number;
}

// Shared completion-moment entrance: fade + a small rise, Confident Ease,
// no overshoot/bounce (Design System §28/§29). Used for genuinely
// significant moments (a completed Practice pass, a Session Result), not
// routine content — respects the OS reduce-motion setting (§31) the same
// way Skeleton does, rendering instantly with no animation when enabled.
export function FadeInUp({ children, style, delay = 0 }: FadeInUpProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay,
        easing: confidentEase,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay,
        easing: confidentEase,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, opacity, translateY, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
