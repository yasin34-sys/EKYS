import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, type DimensionValue } from 'react-native';
import { colors, radii } from '../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

// Design System v1.1 §20: skeleton loaders are the default for primary
// content, replacing spinners. Respects the OS reduce-motion setting
// (§31) — pulses when animation is allowed, otherwise renders as a
// static mid-opacity block.
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.6);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.borderStrong, opacity },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
