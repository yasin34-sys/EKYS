import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { colors, radii, spacing } from '../theme';

export interface AccountRequiredStateProps {
  title?: string;
  message?: string;
}

export function AccountRequiredState({
  title = 'Giriş yap veya kayıt ol',
  message = 'Ana sayfa dışındaki bölümleri kullanmak için hesabını e-posta ile bağla.',
}: AccountRequiredStateProps) {
  return (
    <View style={styles.wrap}>
      <Card variant="hero" style={styles.card}>
        <View style={styles.iconBubble}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.accent} />
        </View>
        <AppText variant="title2" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="subhead" color="secondary" style={styles.message}>
          {message}
        </AppText>
        <PrimaryButton label="Giriş Yap / Kayıt Ol" onPress={() => router.push('/account-register')} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingTop: spacing.xl },
  card: { alignItems: 'center' },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
});
