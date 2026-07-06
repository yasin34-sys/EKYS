import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  useExamRepository,
  useExamSessionRepository,
  useRepeatPoolRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { ScreenContainer, AppText, Card, Skeleton, TopAppBar } from '../../src/components';
import { spacing } from '../../src/theme';

// Home's Hero Card, per SCREEN_SPECIFICATIONS.md §4, has a 3-tier
// priority: 1) resume an active (IN_PROGRESS) Exam Session, 2) else
// surface the Repeat Pool if non-empty, 3) else point at Dersler.
// Single-exam MVP: scoped to the first published exam, same
// simplification already used by Exam Detail/Package Detail.
export default function HomeScreen() {
  const examRepository = useExamRepository();
  const examSessionRepository = useExamSessionRepository();
  const repeatPoolRepository = useRepeatPoolRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const examsQuery = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => new GetPublishedExamsUseCase({ examRepository }).execute(),
  });

  const examId = examsQuery.data?.[0]?.id;

  const activeSessionQuery = useQuery({
    queryKey: ['examSession', 'active', userProfile?.id, examId],
    queryFn: () => examSessionRepository.getActive(userProfile!.id, examId!),
    enabled: Boolean(userProfile) && Boolean(examId),
  });

  const repeatPoolQuery = useQuery({
    queryKey: ['repeatPool', 'count', userProfile?.id, examId],
    queryFn: () => repeatPoolRepository.getForUser(userProfile!.id, examId!),
    enabled: Boolean(userProfile) && Boolean(examId) && activeSessionQuery.data === null,
  });

  // The Hero Card's priority tier (ADR-010's event-driven principle: "app
  // coming to foreground"/a relevant user action triggers refetch, not
  // polling) can go stale otherwise — React Navigation keeps tab screens
  // mounted across switches, so returning to Home after starting or
  // finishing a session wouldn't otherwise refetch these two queries.
  // Manual refetch() bypasses `enabled`, so both calls are guarded the
  // same way `enabled` already is — otherwise a focus event before
  // userProfile/examId resolve would fire a query with a missing id.
  useFocusEffect(
    useCallback(() => {
      if (!userProfile || !examId) return;
      activeSessionQuery.refetch();
      repeatPoolQuery.refetch();
      // The query objects themselves change identity every render and
      // are deliberately left out of the deps array — only re-running
      // on focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile, examId]),
  );

  const isLoading = examsQuery.isLoading || !userProfile;
  const heroLoading =
    isLoading || (Boolean(examId) && activeSessionQuery.isLoading) ||
    (activeSessionQuery.data === null && repeatPoolQuery.isLoading);

  const activeSession = activeSessionQuery.data;
  const repeatPoolCount = repeatPoolQuery.data?.length ?? 0;

  function handleHeroPress() {
    if (activeSession) {
      router.push({
        pathname: '/exam-session/[sessionId]',
        params: { sessionId: activeSession.id, packageId: activeSession.packageId, examId: activeSession.examId },
      });
      return;
    }
    if (repeatPoolCount > 0) {
      router.push('/repeat-pool');
      return;
    }
    router.push('/exams');
  }

  return (
    <ScreenContainer scroll topBar={<TopAppBar />}>
      <View style={styles.header}>
        <AppText variant="largeTitle">EKYS CEPTE</AppText>
        <AppText variant="subhead" color="secondary" style={styles.subtitle}>
          Sınavına hazırlan, ilerlemeni takip et.
        </AppText>
      </View>

      {heroLoading ? (
        <Card variant="hero">
          <Skeleton width="70%" height={22} style={styles.skeletonLine} />
          <Skeleton width="90%" height={16} />
        </Card>
      ) : examsQuery.error ? (
        <Card variant="hero">
          <AppText variant="headline">Bir şeyler ters gitti</AppText>
          <AppText variant="subhead" color="secondary" style={styles.cardBody}>
            Sınavlar yüklenirken bir sorun oluştu.
          </AppText>
        </Card>
      ) : !examId ? (
        <Card variant="hero">
          <AppText variant="headline">Henüz yayınlanmış sınav yok</AppText>
          <AppText variant="subhead" color="secondary" style={styles.cardBody}>
            Yayınlandığında burada göreceksin.
          </AppText>
        </Card>
      ) : (
        <Pressable
          onPress={handleHeroPress}
          accessibilityRole="button"
          accessibilityLabel={
            activeSession
              ? 'Sınava devam et'
              : repeatPoolCount > 0
                ? 'Tekrar havuzuna git'
                : 'Derslere göz at'
          }
        >
          {({ pressed }) => (
            <Card variant="hero" style={pressed ? styles.heroPressed : undefined}>
              {activeSession ? (
                <>
                  <AppText variant="headline">Kaldığın yerden devam et</AppText>
                  <AppText variant="subhead" color="secondary" style={styles.cardBody}>
                    Yarım kalan sınavın seni bekliyor.
                  </AppText>
                </>
              ) : repeatPoolCount > 0 ? (
                <>
                  <AppText variant="headline">{repeatPoolCount} tekrar sorusu seni bekliyor</AppText>
                  <AppText variant="subhead" color="secondary" style={styles.cardBody}>
                    Yanlış yaptığın soruları tekrar çözerek pekiştir.
                  </AppText>
                </>
              ) : (
                <>
                  <AppText variant="headline">Yeni bir konuya başla</AppText>
                  <AppText variant="subhead" color="secondary" style={styles.cardBody}>
                    Çalışmaya başlamak için Dersler sekmesinden bir konu seç.
                  </AppText>
                </>
              )}
            </Card>
          )}
        </Pressable>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  subtitle: { marginTop: spacing.xs },
  cardBody: { marginTop: spacing.xs },
  skeletonLine: { marginBottom: spacing.sm },
  heroPressed: { opacity: 0.9 },
});
