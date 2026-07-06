import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, radii, confidentEase, motionDuration } from '../theme';

export interface ProgressBarProps {
  progress: number; // 0..1
  // Stitch uses two thicknesses: 8px for prominent bars (Home's daily
  // goal/continue-studying), 4px for compact inline bars (topic list
  // mini-progress). Defaults to the prominent size.
  height?: number;
}

// Fills always animate from the previous value to the new one — never
// snap (Design System §23/§29). Width isn't supported by the native
// driver, so this runs on the JS thread; the animation is short and
// infrequent enough (once per question) that this doesn't matter.
export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: motionDuration.progressFill,
      easing: confidentEase,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const width = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.track, { height }]}>
      <Animated.View style={[styles.fill, { width }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radii.full,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
});
