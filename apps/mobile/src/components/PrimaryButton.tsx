import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radii, spacing } from '../theme';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppText variant="headline" color="onAccent">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    // Stitch's rendered button (label-md line-height 16 + py-sm 12+12) is
    // ~40px tall; bumped to the 44pt minimum accessible tap target
    // (still visually matches — the extra room is invisible padding, not
    // a different look) rather than reproducing 40px literally.
    minHeight: 44,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
