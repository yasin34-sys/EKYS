import { Text, type TextProps } from 'react-native';
import { colors, typography } from '../theme';

type Variant = keyof typeof typography;
type ColorRole = 'primary' | 'secondary' | 'tertiary' | 'onAccent' | 'accent' | 'danger' | 'success';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: ColorRole;
}

const colorMap: Record<ColorRole, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  onAccent: colors.textOnAccent,
  accent: colors.accent,
  danger: colors.danger,
  success: colors.success,
};

// The one way text is styled anywhere in the app — enforces the
// typography scale instead of letting screens invent ad-hoc font
// sizes/weights.
export function AppText({ variant = 'body', color = 'primary', style, ...props }: AppTextProps) {
  return <Text style={[typography[variant], { color: colorMap[color] }, style]} {...props} />;
}
