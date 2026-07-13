import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthService, useCurrentUserProfile } from '../src/services/hooks';
import {
  AppText,
  BackButton,
  Card,
  InfoState,
  PrimaryButton,
  ScreenContainer,
} from '../src/components';
import { colors, radii, spacing } from '../src/theme';

const MIN_PASSWORD_LENGTH = 8;

// REGISTERED users only — an ANONYMOUS session has no password identity
// to change. Navigated to only from account-management.tsx, which
// already gates its own "Şifre Değiştir" row on isRegistered, but this
// screen re-checks itself since a direct deep link must not crash or
// silently no-op against a session with no password to update.
export default function AccountPasswordScreen() {
  const authService = useAuthService();
  const { data: userProfile, isLoading } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = newPassword.length >= MIN_PASSWORD_LENGTH && passwordsMatch && !submitting;

  const helperText = useMemo(() => {
    if (newPassword.length === 0) return `En az ${MIN_PASSWORD_LENGTH} karakter.`;
    if (newPassword.length < MIN_PASSWORD_LENGTH) return 'Şifre çok kısa.';
    if (confirmPassword.length === 0) return 'Şifreni tekrar gir.';
    if (!passwordsMatch) return 'Şifreler eşleşmiyor.';
    return 'Şifren hazır.';
  }, [newPassword, confirmPassword, passwordsMatch]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await authService.updatePassword(newPassword);
      Alert.alert('Şifre güncellendi', 'Yeni şifren kaydedildi.');
      router.back();
    } catch (error) {
      Alert.alert(
        'Şifre değiştirilemedi',
        error instanceof Error
          ? error.message
          : 'Lütfen bağlantını kontrol edip tekrar dene.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoading && !isRegistered) {
    return (
      <ScreenContainer scroll>
        <View style={styles.headerRow}>
          <BackButton />
        </View>
        <InfoState
          icon="lock-closed-outline"
          tone="info"
          title="Hesabını bağla"
          message="Şifre değiştirmek için önce hesabını e-posta ile bağlaman gerekir."
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
              <Ionicons name="lock-closed-outline" size={26} color={colors.accent} />
            </View>
            <View style={styles.heroText}>
              <AppText variant="title2">Şifre Değiştir</AppText>
              <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
                Hesabın için yeni bir şifre belirle.
              </AppText>
            </View>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <AppText variant="headline">Yeni Şifre</AppText>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Yeni şifren"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="newPassword"
            style={styles.input}
          />

          <AppText variant="headline">Yeni Şifre (Tekrar)</AppText>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Yeni şifreni tekrar gir"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="newPassword"
            style={styles.input}
          />

          <AppText variant="footnote" color="secondary">
            {helperText}
          </AppText>

          <PrimaryButton
            label={submitting ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </Card>
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
});
