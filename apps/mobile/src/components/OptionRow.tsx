import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radii, spacing, confidentEase } from '../theme';

export type OptionRowState = 'default' | 'selected' | 'correct' | 'incorrect' | 'dimmed';

export interface OptionRowProps {
  label: string; // A/B/C/D/E
  body: string;
  state: OptionRowState;
  onPress?: () => void;
  disabled?: boolean;
}

const stateStyles: Record<OptionRowState, { border: string; background: string }> = {
  default: { border: colors.border, background: colors.surface },
  selected: { border: colors.accent, background: colors.accentMuted },
  correct: { border: colors.success, background: colors.successMuted },
  incorrect: { border: colors.danger, background: colors.dangerMuted },
  dimmed: { border: colors.border, background: colors.surface },
};

const REVEAL_ICON_DURATION = 180;
const TRANSITION_DURATION = 120; // Design System §29: option selection, 120ms

// Full-width selectable row, not a small radio circle — the app's
// single highest-frequency interaction deserves a large, confident tap
// target (Design System §14, §26). State is never color-only: selected
// and correct/incorrect are always paired with an icon.
export function OptionRow({ label, body, state, onPress, disabled }: OptionRowProps) {
  const { border, background } = stateStyles[state];

  // Border/background transition, 120ms, Confident Ease (§29) — animates
  // from whatever the row's previous state colors were to the new ones,
  // rather than snapping instantly.
  const transition = useRef(new Animated.Value(0)).current;
  const prevColors = useRef({ border, background });
  const fromColors = prevColors.current;

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: TRANSITION_DURATION,
      easing: confidentEase,
      useNativeDriver: false,
    }).start();
    prevColors.current = { border, background };
    // Only the resolved colors (derived from `state`) should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const animatedBorderColor = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [fromColors.border, border],
  });
  const animatedBackgroundColor = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [fromColors.background, background],
  });

  const showIcon = state === 'selected' || state === 'correct' || state === 'incorrect';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [state === 'dimmed' && styles.dimmed, pressed && !disabled && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Seçenek ${label}: ${body}${
        state === 'correct' ? ', doğru cevap' : state === 'incorrect' ? ', yanlış seçim' : ''
      }`}
    >
      <Animated.View
        style={[
          styles.row,
          { borderColor: animatedBorderColor, backgroundColor: animatedBackgroundColor },
        ]}
      >
        <View style={[styles.labelBadge, { borderColor: border }]}>
          <AppText variant="caption" style={{ color: border }}>
            {label}
          </AppText>
        </View>
        <AppText variant="body" style={styles.body}>
          {body}
        </AppText>
        {showIcon ? (
          <RevealIcon
            name={state === 'incorrect' ? 'close-circle' : 'checkmark-circle'}
            color={state === 'selected' ? colors.accent : state === 'correct' ? colors.success : colors.danger}
          />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

// Icon scales in with no overshoot (Design System §29/§10 of Question
// Result) — a controlled arrival via ease-out timing, never a spring
// bounce, which would read as playful/gamified.
function RevealIcon({ name, color }: { name: 'checkmark-circle' | 'close-circle'; color: string }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: REVEAL_ICON_DURATION,
        easing: confidentEase,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: REVEAL_ICON_DURATION,
        easing: confidentEase,
        useNativeDriver: true,
      }),
    ]).start();
    // Mount-once entrance; icon identity (name/color) already keys the row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Ionicons name={name} size={22} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  labelBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  body: { flex: 1 },
  dimmed: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
