import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthService, useUserProfileRepository } from '../src/services/hooks';
import { SignInWithPasswordUseCase } from '../src/application/SignInWithPasswordUseCase';
import { APPLE_SIGN_IN_ENABLED, GOOGLE_OAUTH_ENABLED } from '../src/auth/oauthConfig';
import {
  AppText,
  BackButton,
  Card,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
} from '../src/components';
import { colors, radii, spacing } from '../src/theme';

// Google must never be the only third-party login on iOS without Sign
// in with Apple alongside it (App Store Review Guideline 4.8) — so on
// iOS this additionally requires APPLE_SIGN_IN_ENABLED, which isn't
// implemented yet. Android has no such parity rule. Both flags default
// to false (see oauthConfig.ts), so today this is hidden everywhere.
const SHOW_GOOGLE_SIGN_IN =
  GOOGLE_OAUTH_ENABLED && (Platform.OS === 'android' || APPLE_SIGN_IN_ENABLED);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Existing-user sign-in only — there is no account creation on this
// screen. New accounts are created via the anonymous-upgrade flow in
// account-register.tsx (or directly in the Supabase Dashboard for
// QA/support use); this screen only ever calls signInWithPassword.
export default function AccountSignInScreen() {
  const authService = useAuthService();
  const userProfileRepository = useUserProfileRepository();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canSubmit = isValidEmail(normalizedEmail) && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await new SignInWithPasswordUseCase({ authService, userProfileRepository }).execute({
        email: normalizedEmail,
        password,
      });

      // Broad clear, not a narrow invalidation — same reasoning as
      // account-management.tsx's logout: the cache may hold the
      // previous local user's profile/metrics/exam data, and a missed
      // query key would let it flash under the newly signed-in user.
      queryClient.clear();
      router.replace('/');
    } catch {
      Alert.alert('Giriş yapılamadı', 'E-posta veya şifreyi kontrol edip tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  }

  // Only starts the browser redirect — does not itself navigate away.
  // Completion happens in app/auth-callback.tsx once the provider
  // redirects back into the app.
  async function handleGoogleSignIn() {
    try {
      await authService.signInWithOAuthProvider('google');
    } catch {
      Alert.alert('Giriş başlatılamadı', 'Lütfen bağlantını kontrol edip tekrar dene.');
    }
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
              <Ionicons name="log-in-outline" size={26} color={colors.accent} />
            </View>
            <View style={styles.heroText}>
              <AppText variant="title2">Giriş Yap</AppText>
              <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
                Daha önce e-posta ile bağladığın hesabına giriş yap.
              </AppText>
            </View>
          </View>
        </Card>

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

          <AppText variant="headline">Şifre</AppText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Şifren"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
            style={styles.input}
          />

          <PrimaryButton
            label={submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            onPress={handleSubmit}
            disabled={!canSubmit}
          />

          {/* Honest "coming soon", not a broken flow: password-reset email
              needs Supabase Auth's redirect URL allowlist configured for
              this app's deep link, which hasn't been confirmed yet.
              Same pattern as Settings/About's other not-yet-wired rows. */}
          <View style={styles.forgotRow}>
            <AppText variant="footnote" color="tertiary">
              Şifremi Unuttum
            </AppText>
            <View style={styles.comingSoonTag}>
              <AppText variant="caption" color="tertiary">
                Yakında
              </AppText>
            </View>
          </View>
        </Card>

        {SHOW_GOOGLE_SIGN_IN ? (
          <View style={styles.googleWrap}>
            <SecondaryButton label="Google ile Giriş Yap" onPress={handleGoogleSignIn} />
          </View>
        ) : null}
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
  forgotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  comingSoonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  googleWrap: { marginTop: spacing.md },
});
