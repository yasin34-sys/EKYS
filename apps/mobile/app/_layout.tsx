import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IntegrityCheckResult } from '../src/database/sqlite';
import { createServices } from '../src/services/createServices';
import { ServiceProvider } from '../src/services/ServiceProvider';
import type { Services } from '../src/services/types';
import { BootstrapAppUseCase } from '../src/application/BootstrapAppUseCase';
import { AuthNotConfiguredError } from '../src/auth/errors';
import { ScreenContainer, LoadingState, InfoState } from '../src/components';
import { useAppFonts } from '../src/theme';
import OnboardingScreen from '../src/screens/OnboardingScreen';

type BootstrapState =
  | { status: 'loading' }
  | { status: 'auth-not-configured' }
  | { status: 'database-integrity-error'; result: IntegrityCheckResult }
  | { status: 'ready'; services: Services }
  | { status: 'error'; message: string };

// Created once, module-level — not per render, per mount cycle.
const queryClient = new QueryClient();

// Keeps the native splash (config-plugin-driven, see app.json) visible
// from native process start until fonts are ready — called at module
// scope, before RootLayout ever mounts. Swallowed: a second call (e.g.
// Fast Refresh) throws, and that's not a real failure.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Versioned so a future redesign of onboarding can show it again to
// everyone by bumping the suffix, without needing a migration — reading
// an unset key returns null, which reads as "not seen" (never crashes,
// never assumes false is true).
const ONBOARDING_STORAGE_KEY = 'ekys:onboarding:v1:seen';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [bootstrap, setBootstrap] = useState<BootstrapState>({ status: 'loading' });

  // Hides the native splash as soon as fonts are ready — deliberately
  // independent of bootstrap.status, since the native splash's only job
  // is to bridge native process start to the first real React paint
  // (even if that paint is just the "Yükleniyor…" loading state below),
  // not to babysit auth/bootstrap/sync. A bootstrap or database-integrity
  // error must never leave the app stuck behind the native splash — this
  // effect fires regardless of how bootstrap eventually resolves.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);
  // Independent of bootstrap on purpose: a local-only AsyncStorage read,
  // no network/auth/sync involved, so it can never be the thing that
  // makes bootstrap slower or less reliable. null = not yet read.
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => {
        if (!cancelled) setOnboardingSeen(value === 'true');
      })
      .catch(() => {
        // A storage read failure must never trap the user before Home —
        // treat it the same as "already seen" rather than getting stuck.
        if (!cancelled) setOnboardingSeen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOnboardingComplete() {
    setOnboardingSeen(true);
    // Best-effort: if this write fails, onboarding may show once more on
    // the next launch, which is a mild inconvenience, not a functional break.
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true').catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrapApp() {
      try {
        let services: Services;

        if (Platform.OS === 'web') {
          // @op-engineering/op-sqlite is a native-only TurboModule with no
          // usable browser bundle in this project's Metro configuration.
          // Web is not a target platform per ADR-001 (iOS/Android only) —
          // this branch exists solely so screens can be visually inspected
          // with Playwright in environments without a device/simulator.
          // See src/services/webPreview/ for details. Native platforms
          // never execute this branch.
          const { createWebPreviewServices } = await import(
            '../src/services/webPreview/createWebPreviewServices'
          );
          services = createWebPreviewServices();
        } else {
          // Dynamically imported so its top-level `open` import from
          // @op-engineering/op-sqlite is never evaluated on web.
          const { initializeDatabase, verifyIntegrity } = await import(
            '../src/database/sqlite'
          );
          const { supabase } = await import('../src/database/supabaseClient');

          // Bootstrap sequence, per the approved Mobile Architecture Plan:
          // 1. Run local SQLite migrations.
          // 2. Run local integrity verification — a distinct, named
          //    failure state, not lumped into a generic error, since the
          //    app must never silently trust a database it hasn't
          //    verified.
          const db = await initializeDatabase();

          const integrity = await verifyIntegrity();
          if (!integrity.ok) {
            if (!cancelled) {
              setBootstrap({ status: 'database-integrity-error', result: integrity });
            }
            return;
          }

          services = createServices(db, supabase);
        }

        // Fails gracefully rather than crashing: without real Supabase
        // credentials, AuthService throws AuthNotConfiguredError, which
        // is caught below and shown as its own distinct, calm,
        // currently-expected state — not a generic error.
        await new BootstrapAppUseCase(services).execute();

        // Fire-and-forget, deliberately not awaited: reaching 'ready'
        // must never wait on network access. Provisions the server-side
        // user_profiles row (signInAnonymously() alone doesn't create
        // one) before the first pull, then pulls server-authoritative
        // content down. Any failure here (offline, auth not configured,
        // etc.) is swallowed — it must not surface as a bootstrap error,
        // since the app is otherwise fully usable offline.
        //
        // On success, every active query is invalidated/refetched —
        // broad on purpose, not narrowed to specific query keys. This
        // fires exactly once per app launch (a single post-bootstrap
        // sync event, not polling), so the cost of a blanket
        // invalidation is one extra refetch round for whatever screens
        // happen to be mounted, not a recurring one. Narrowing this to
        // a hand-maintained list of query keys (exams/topics/packages/
        // package/questions/userProfile/dashboardMetrics/repeatPool/
        // examSession...) would need updating every time a screen adds
        // a new query, and a missed key would silently leave a screen
        // showing stale pre-sync data with no error to signal it —
        // exactly the bug this fix exists to close. `cancelled` guards
        // against invalidating after this effect has already torn down
        // (e.g. fast remount in development).
        services.authService
          .ensureServerUserProfile()
          .then(() => services.syncService.pull())
          .then(() => {
            if (cancelled) return;
            queryClient.invalidateQueries();
          })
          .catch((error) => {
            console.warn('Initial post-bootstrap sync failed', error);
          });

        if (!cancelled) {
          setBootstrap({ status: 'ready', services });
        }
      } catch (error) {
        if (cancelled) return;

        if (error instanceof AuthNotConfiguredError) {
          setBootstrap({ status: 'auth-not-configured' });
        } else {
          setBootstrap({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    bootstrapApp();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!fontsLoaded || bootstrap.status === 'loading' || (bootstrap.status === 'ready' && onboardingSeen === null)) {
    return (
      <SafeAreaProvider>
        <ScreenContainer centered>
          <LoadingState label="Yükleniyor…" />
          <StatusBar style="dark" />
        </ScreenContainer>
      </SafeAreaProvider>
    );
  }

  if (bootstrap.status === 'auth-not-configured') {
    return (
      <SafeAreaProvider>
        <ScreenContainer centered>
          <InfoState
            icon="key-outline"
            tone="info"
            title="Kimlik doğrulama yapılandırılmadı"
            message="Supabase ortam değişkenleri henüz tanımlanmadı. Gerçek kimlik bilgileri sağlanana kadar bu beklenen bir durumdur."
          />
          <StatusBar style="dark" />
        </ScreenContainer>
      </SafeAreaProvider>
    );
  }

  if (bootstrap.status === 'database-integrity-error') {
    return (
      <SafeAreaProvider>
        <ScreenContainer centered>
          <InfoState
            icon="warning-outline"
            tone="danger"
            title="Veritabanı bütünlük hatası"
            message="Yerel veritabanı bütünlük denetimini geçemedi."
          />
          <StatusBar style="dark" />
        </ScreenContainer>
      </SafeAreaProvider>
    );
  }

  if (bootstrap.status === 'error') {
    return (
      <SafeAreaProvider>
        <ScreenContainer centered>
          <InfoState
            icon="alert-circle-outline"
            tone="danger"
            title="Bir şeyler ters gitti"
            message={bootstrap.message}
          />
          <StatusBar style="dark" />
        </ScreenContainer>
      </SafeAreaProvider>
    );
  }

  // Shown once, on first launch, before the tab stack ever mounts — not
  // reached via router navigation, so there's no "flash of Home then
  // jump to onboarding" and no interaction with Stack/back-button state.
  if (onboardingSeen === false) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ServiceProvider services={bootstrap.services}>
          {/* headerShown: false — headers are custom, in-content
              components (Design System §17), not React Navigation's
              native header bar. Detail screens push over the tab bar,
              which is the correct behavior for a genuine drill-down.
              Screens declared explicitly rather than relying on
              implicit file-based registration alone. */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="exam/[id]" />
            <Stack.Screen name="package/[id]" />
            <Stack.Screen name="topic/[topicId]" />
            <Stack.Screen name="exam-start/[packageId]" />
            <Stack.Screen name="question/[packageId]" />
            <Stack.Screen name="exam-session/[sessionId]" />
            <Stack.Screen name="session-result/[sessionId]" />
            <Stack.Screen name="repeat-pool" />
            <Stack.Screen name="learning-progress" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
          </Stack>
          <StatusBar style="dark" />
        </ServiceProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
