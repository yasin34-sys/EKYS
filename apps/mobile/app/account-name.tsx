import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthService, useCurrentUserProfile } from '../src/services/hooks';
import {
  AppText,
  BackButton,
  Card,
  InfoState,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
} from '../src/components';
import { colors, radii, spacing } from '../src/theme';

// Stored in Supabase auth user_metadata (full_name) rather than a
// user_profiles column — no schema migration needed, and it's genuinely
// identity data (who the person is), not app-domain data.
export default function AccountNameScreen() {
  const authService = useAuthService();
  const queryClient = useQueryClient();
  const { data: userProfile, isLoading: profileLoading } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';

  const [fullName, setFullName] = useState('');
  const [loadingName, setLoadingName] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isRegistered) {
      setLoadingName(false);
      return;
    }
    authService
      .getDisplayName()
      .then((name) => {
        if (!cancelled) setFullName(name ?? '');
      })
      .catch(() => {
        if (!cancelled) setFullName('');
      })
      .finally(() => {
        if (!cancelled) setLoadingName(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authService, isRegistered]);

  const trimmedName = fullName.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await authService.updateDisplayName(trimmedName);
      await queryClient.invalidateQueries({ queryKey: ['authDisplayName'] });
      Alert.alert('Kaydedildi', 'Adın güncellendi.');
      router.back();
    } catch (error) {
      Alert.alert(
        'Kaydedilemedi',
        error instanceof Error
          ? error.message
          : 'Lütfen bağlantını kontrol edip tekrar dene.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!profileLoading && !isRegistered) {
    return (
      <ScreenContainer scroll>
        <View style={styles.headerRow}>
          <BackButton />
        </View>
        <InfoState
          icon="person-outline"
          tone="info"
          title="Hesabını bağla"
          message="Adını kaydetmek için önce hesabını e-posta ile bağlaman gerekir."
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
              <Ionicons name="person-outline" size={26} color={colors.accent} />
            </View>
            <View style={styles.heroText}>
              <AppText variant="title2">Ad Soyad</AppText>
              <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
                Profilinde görünecek adını belirle.
              </AppText>
            </View>
          </View>
        </Card>

        {profileLoading || loadingName ? (
          <LoadingState label="Yükleniyor…" />
        ) : (
          <Card style={styles.formCard}>
            <AppText variant="headline">Ad Soyad</AppText>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              style={styles.input}
            />

            <PrimaryButton
              label={submitting ? 'Kaydediliyor...' : 'Kaydet'}
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </Card>
        )}
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
