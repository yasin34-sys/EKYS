import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, spacing } from '../theme';

export interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

// Design System v2.0's Secondary variant — matches stitch's "İncele"
// button: neutral surfaceSecondary fill + border, accent-colored label.
// Deliberately not an accent-bordered button (that was v1.1's treatment) —
// stitch never borders a secondary button in accent, only the label is
// accent-colored.
export function SecondaryButton({ label, onPress, disabled }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppText variant="headline" color="accent">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});
