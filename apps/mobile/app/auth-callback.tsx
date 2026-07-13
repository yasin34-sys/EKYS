import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthService, useUserProfileRepository } from '../src/services/hooks';
import { CompleteOAuthSignInUseCase } from '../src/application/CompleteOAuthSignInUseCase';
import { InfoState, LoadingState, ScreenContainer } from '../src/components';
import { spacing } from '../src/theme';

// Landing point for the ekyscepte://auth-callback redirect that
// signInWithOAuthProvider() sends the user's browser to after they
// approve sign-in with the provider. Supabase's implicit flow puts the
// tokens in the URL *fragment* (after #), not the query string, because
// a fragment is never sent to a server — so this has to read the raw
// initial URL and split it manually rather than use expo-router's
// parsed route params.
export default function AuthCallbackScreen() {
  const authService = useAuthService();
  const userProfileRepository = useUserProfileRepository();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      try {
        const url = await ExpoLinking.getInitialURL();
        const fragment = url?.split('#')[1] ?? '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          throw new Error('Giriş bilgisi eksik. Lütfen tekrar dene.');
        }

        await new CompleteOAuthSignInUseCase({ authService, userProfileRepository }).execute({
          accessToken,
          refreshToken,
        });

        if (cancelled) return;
        // Same broad-clear reasoning as SignInWithPasswordUseCase's
        // caller (account-signin.tsx): the cache may hold the previous
        // local user's data.
        queryClient.clear();
        router.replace('/');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Giriş tamamlanamadı.');
        }
      }
    }

    complete();
    return () => {
      cancelled = true;
    };
  }, [authService, userProfileRepository, queryClient]);

  if (error) {
    return (
      <ScreenContainer centered>
        <InfoState
          icon="alert-circle-outline"
          tone="danger"
          title="Giriş tamamlanamadı"
          message={error}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer centered>
      <View style={styles.wrap}>
        <LoadingState label="Giriş tamamlanıyor…" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
});
