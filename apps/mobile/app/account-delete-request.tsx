import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthService, useCurrentUserProfile } from '../src/services/hooks';
import {
  AppText,
  BackButton,
  Card,
  PrimaryButton,
  ScreenContainer,
} from '../src/components';
import { colors, radii, spacing } from '../src/theme';

const SUPPORT_EMAIL = 'ekysceptedestek@gmail.com';

// Honest, not automated: there is no server-side function (and no
// service_role key in this app) that can delete a Supabase Auth user or
// cascade-delete their rows. This screen only starts a real request —
// a prefilled email to support, who deletes manually — never claims the
// account is deleted the moment this button is pressed. Satisfies the
// "provide an in-app way to request deletion" requirement without
// pretending to be instant self-service deletion.
export default function AccountDeleteRequestScreen() {
  const authService = useAuthService();
  const { data: userProfile } = useCurrentUserProfile();
  const [requestSent, setRequestSent] = useState(false);

  async function handleRequestPress() {
    const userId = await authService.getCurrentUserId().catch(() => null);
    const subject = encodeURIComponent('EKYS CEPTE hesap silme talebi');
    const body = encodeURIComponent(
      `Hesabımın ve ilişkili verilerimin silinmesini talep ediyorum.\n\nHesap kimliği: ${userId ?? 'bilinmiyor'}`,
    );
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
      setRequestSent(true);
    } catch {
      Alert.alert(
        'E-posta uygulaması açılamadı',
        `Lütfen ${SUPPORT_EMAIL} adresine talebini manuel olarak gönder.`,
      );
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <Card variant="hero" style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.iconBubble}>
            <Ionicons name="trash-outline" size={26} color={colors.danger} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="title2">Hesabı Silme Talebi</AppText>
            <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
              {userProfile?.accountStatus === 'REGISTERED'
                ? 'Hesabın ve sunucudaki verilerin kalıcı olarak silinsin.'
                : 'Bu cihazdaki yerel verilerinin silinmesini talep et.'}
            </AppText>
          </View>
        </View>
      </Card>

      <Card style={styles.formCard}>
        <AppText variant="footnote" color="secondary">
          Bu talep anında otomatik silme yapmaz. Gönderdiğin e-postayı destek
          ekibimiz elle inceler ve hesabını ile ilişkili verilerini makul bir
          süre içinde siler. İşlem tamamlandığında sana e-posta ile haber
          veririz.
        </AppText>

        {requestSent ? (
          <View style={styles.sentRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.accent} />
            <AppText variant="footnote" color="secondary" style={styles.sentText}>
              E-posta uygulaman açıldı. Talebini göndermeyi unutma — gönderene
              kadar hiçbir şey silinmez.
            </AppText>
          </View>
        ) : null}

        <PrimaryButton label="Silme Talebi Gönder" onPress={handleRequestPress} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  heroCard: { marginBottom: spacing.xl },
  heroTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroCopy: { marginTop: spacing.xs },
  formCard: { gap: spacing.md },
  sentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  sentText: { flex: 1 },
});
