import { StyleSheet, View, Image, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radii, spacing } from '../theme';

export interface InfoStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'info' | 'danger';
  title: string;
  message?: string;
  // Optional real illustration (e.g. assets/illustrations/offline.png)
  // shown instead of the icon badge — only used where a real,
  // already-made illustration exists. Every existing call site omits
  // this and keeps rendering the icon badge exactly as before.
  illustration?: ImageSourcePropType;
}

// Distinct from EmptyState: used for bootstrap states like
// auth-not-configured, which are currently expected during
// development, not user-facing failures — calm/info tone by default,
// danger reserved for genuinely unexpected errors.
export function InfoState({ icon, tone = 'info', title, message, illustration }: InfoStateProps) {
  const tintColor = tone === 'danger' ? colors.danger : colors.info;
  return (
    <View style={styles.container}>
      {illustration ? (
        <Image source={illustration} style={styles.illustration} resizeMode="contain" />
      ) : icon ? (
        <View style={[styles.iconWrap, { backgroundColor: `${tintColor}1A` }]}>
          <Ionicons name={icon} size={28} color={tintColor} />
        </View>
      ) : null}
      <AppText variant="title3" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="subhead" color="secondary" style={styles.message}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  illustration: {
    width: 180,
    height: 120,
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center' },
});
