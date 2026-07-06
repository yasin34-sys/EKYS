import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.accent} />
      {label ? (
        <AppText variant="subhead" color="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { marginTop: spacing.xs },
});
