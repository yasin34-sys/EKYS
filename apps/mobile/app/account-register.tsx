import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuthService,
  useCurrentUserProfile,
  useUserProfileRepository,
} from '../src/services/hooks';
import { StartAccountRegistrationUseCase } from '../src/application/StartAccountRegistrationUseCase';
import {
  AppText,
  BackButton,
  Card,
  InfoState,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from '../src/components';
import { colors, radii, spacing } from '../src/theme';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AccountRegisterScreen() {
  const authService = useAuthService();
  const userProfileRepository = useUserProfileRepository();
  const queryClient = useQueryClient();
  const { data: userProfile } = useCurrentUserProfile();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = isValidEmail(normalizedEmail) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await new StartAccountRegistrationUseCase({
        authService,
        userProfileRepository,
      }).execute({ email: normalizedEmail });

      await queryClient.invalidateQueries({ queryKey: ['userProfile', 'current'] });

      if (result.status === 'REGISTERED') {
        Alert.alert('Hesap bağlandı', 'Hesabın artık bu e-posta ile bağlı.');
        router.back();
      } else {
        setVerificationSent(true);
      }
    } catch (error) {
      Alert.alert(
        'İşlem tamamlanamadı',
        error instanceof Error
          ? error.message
          : 'Lütfen bağlantını kontrol edip tekrar dene.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (userProfile?.accountStatus === 'REGISTERED') {
    return (
      <ScreenContainer scroll>
        <View style={styles.headerRow}>
          <BackButton />
        </View>
        <InfoState
          icon="checkmark-circle-outline"
          tone="info"
          title="Hesabın bağlı"
          message="Bu cihazdaki çalışma ilerlemen kayıtlı hesabınla eşleşiyor."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <BackButton />
        </View>

        <Card variant="hero" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.iconBubble}>
              <Ionicons name="shield-checkmark-outline" size={26} color={colors.accent} />
            </View>
            <View style={styles.heroText}>
              <AppText variant="title2">Giriş Yap / Kayıt Ol</AppText>
              <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
                İlerlemen, premium erişimin ve satın alma geçmişin e-posta hesabına bağlanır.
              </AppText>
            </View>
          </View>
        </Card>

        {verificationSent ? (
          <InfoState
            icon="mail-outline"
            tone="info"
            title="Doğrulama e-postası gönderildi"
            message="E-postandaki bağlantıyı açarak hesabını doğrula. Doğrulama tamamlandıktan sonra şifre belirleme ve giriş akışı açılacak."
          />
        ) : (
          <Card style={styles.formCard}>
            <AppText variant="headline">E-posta</AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@eposta.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
            />

            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <AppText variant="footnote" color="secondary" style={styles.noteText}>
                Önce e-postan doğrulanır, ardından şifreni belirlersin.
              </AppText>
            </View>

            <PrimaryButton
              label={submitting ? 'Gönderiliyor...' : 'Devam E-postası Gönder'}
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </Card>
        )}

        <View style={styles.signInLinkWrap}>
          <SecondaryButton
            label="Zaten hesabın var mı? Giriş Yap"
            onPress={() => router.push('/account-signin')}
          />
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroCopy: { marginTop: spacing.xs },
  formCard: { gap: spacing.md },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  noteText: { flex: 1 },
  signInLinkWrap: { marginTop: spacing.lg },
});
