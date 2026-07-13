import { useCallback } from 'react';
import { ImageBackground, View, StyleSheet, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useExamRepository,
  useExamSessionRepository,
  useRepeatPoolRepository,
  useTopicRepository,
  useLearningMetricsRepository,
  useAttemptRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPublishedExamsUseCase } from '../../src/application/GetPublishedExamsUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import { GetDashboardMetricsUseCase } from '../../src/application/GetDashboardMetricsUseCase';
import { GetRecentActivityUseCase } from '../../src/application/GetRecentActivityUseCase';
import type { RecentActivityItem } from '../../src/application/GetRecentActivityUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  TopAppBar,
  IconChip,
  TopicMasteryChip,
  ProgressBar,
} from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';

const studyDeskImage = require('../../assets/illustrations/study-desk.jpg');

// Real device time only — user_profiles has no name/photo field to greet
// by (see Phase 3A audit), so this is the honest version of
// ekranlar/ana_sayfa's "Merhaba Ahmet, Hoş Geldiniz" personalization:
// warm, but never inventing a name or avatar that doesn't exist.
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi Çalışmalar';
  if (hour >= 18 && hour < 22) return 'İyi Akşamlar';
  return 'İyi Geceler';
}

// Simple, real relative-time formatting for "Son Aktivite" timestamps —
// no library added, just a few honest buckets (dk/sa/gün).
function formatRelativeTime(isoString: string, now: Date): string {
  const diffMs = now.getTime() - new Date(isoString).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

// Switch (not an intermediate boolean) so TypeScript actually narrows
// `item` per case — a real requirement here, not just a lint nicety,
// since DENEME_COMPLETED and QUESTION_SOLVED expose different fields.
function describeRecentActivityItem(item: RecentActivityItem): {
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  iconColor: string;
  title: string;
  subtitle: string;
} {
  switch (item.type) {
    case 'DENEME_COMPLETED':
      return {
        icon: 'document-text-outline',
        background: colors.accentMuted,
        iconColor: colors.accent,
        title: 'Deneme tamamlandı',
        subtitle: `Puan: ${Math.round(item.score)}`,
      };
    case 'QUESTION_SOLVED':
      return item.isCorrect
        ? {
            icon: 'checkmark-circle',
            background: colors.successMuted,
            iconColor: colors.success,
            title: 'Soru çözüldü',
            subtitle: 'Doğru',
          }
        : {
            icon: 'close-circle',
            background: colors.dangerMuted,
            iconColor: colors.danger,
            title: 'Soru çözüldü',
            subtitle: 'Yanlış',
          };
  }
}

// Home's Hero Card, per SCREEN_SPECIFICATIONS.md §4, has a 3-tier
// priority: 1) resume an active (IN_PROGRESS) Exam Session, 2) else
// surface the Repeat Pool if non-empty, 3) else point at Dersler.
// Single-exam MVP: scoped to the first published exam, same
// simplification already used by Exam Detail/Package Detail.
export default function HomeScreen() {
  const examRepository = useExamRepository();
  const examSessionRepository = useExamSessionRepository();
  const repeatPoolRepository = useRepeatPoolRepository();
  const topicRepository = useTopicRepository();
  const learningMetricsRepository = useLearningMetricsRepository();
  const attemptRepository = useAttemptRepository();

  const { data: userProfile } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';

  const examsQuery = useQuery({
    queryKey: ['exams', 'published'],
    queryFn: () => new GetPublishedExamsUseCase({ examRepository }).execute(),
  });

  const examId = examsQuery.data?.[0]?.id;

  const activeSessionQuery = useQuery({
    queryKey: ['examSession', 'active', userProfile?.id, examId],
    queryFn: () => examSessionRepository.getActive(userProfile!.id, examId!),
    enabled: isRegistered && Boolean(examId),
  });

  const repeatPoolQuery = useQuery({
    queryKey: ['repeatPool', 'count', userProfile?.id, examId],
    queryFn: () => repeatPoolRepository.getForUser(userProfile!.id, examId!),
    enabled: isRegistered && Boolean(examId) && activeSessionQuery.data === null,
  });

  // "Odaklanılacak Konular" (weak-topics) section below the hero — same
  // TOPIC_ACCURACY data already trusted on Statistics/Learning Progress,
  // just re-read here. No new domain concept, no fabricated percentages:
  // if either query hasn't resolved real data yet, weakTopics is simply
  // empty and the section renders nothing (see render below).
  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(examId as string),
    enabled: Boolean(examId) && isRegistered,
  });

  const dashboardMetricsQuery = useQuery({
    queryKey: ['dashboardMetrics', userProfile?.id, examId],
    queryFn: () =>
      new GetDashboardMetricsUseCase({ learningMetricsRepository }).execute(
        userProfile!.id,
        examId as string,
      ),
    enabled: isRegistered && Boolean(examId),
  });

  // "Son Aktivite" — real completed Denemeler + standalone practice/
  // repeat/trial attempts only, see GetRecentActivityUseCase for exactly
  // what is and isn't included. No fabricated streaks/charts/time-spent.
  const recentActivityQuery = useQuery({
    queryKey: ['recentActivity', userProfile?.id],
    queryFn: () =>
      new GetRecentActivityUseCase({ examSessionRepository, attemptRepository }).execute(
        userProfile!.id,
      ),
    enabled: isRegistered,
  });

  // The Hero Card's priority tier (ADR-010's event-driven principle: "app
  // coming to foreground"/a relevant user action triggers refetch, not
  // polling) can go stale otherwise — React Navigation keeps tab screens
  // mounted across switches, so returning to Home after starting or
  // finishing a session wouldn't otherwise refetch these two queries.
  // Manual refetch() bypasses `enabled`, so both calls are guarded the
  // same way `enabled` already is — otherwise a focus event before
  // userProfile/examId resolve would fire a query with a missing id.
  // dashboardMetricsQuery (the weak-topics section) is guarded and
  // refetched the same way, for the same reason — solving practice/repeat
  // questions elsewhere and returning Home should reflect the just-updated
  // TOPIC_ACCURACY values, not a stale mount-time snapshot (same fix
  // Statistics/learning-progress already apply to this exact query).
  useFocusEffect(
    useCallback(() => {
      if (!isRegistered || !examId) return;
      activeSessionQuery.refetch();
      repeatPoolQuery.refetch();
      dashboardMetricsQuery.refetch();
      recentActivityQuery.refetch();
      // The query objects themselves change identity every render and
      // are deliberately left out of the deps array — only re-running
      // on focus or when the guard's own ids change is intended here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRegistered, examId]),
  );

  const isLoading = examsQuery.isLoading || !userProfile;
  const heroLoading =
    isLoading || (Boolean(examId) && activeSessionQuery.isLoading) ||
    (activeSessionQuery.data === null && repeatPoolQuery.isLoading);

  const activeSession = activeSessionQuery.data;
  const repeatPoolCount = repeatPoolQuery.data?.length ?? 0;

  // Lowest-2 real TOPIC_ACCURACY values with a resolvable topic name —
  // never fabricated, never shown until both queries have real data.
  const weakTopics =
    topicsQuery.data && dashboardMetricsQuery.data
      ? (() => {
          const topicsById = new Map(topicsQuery.data.map((topic) => [topic.id, topic]));
          return dashboardMetricsQuery.data.topicMetrics
            .filter(
              (metric) =>
                metric.metricType === 'TOPIC_ACCURACY' &&
                metric.topicId !== null &&
                topicsById.has(metric.topicId),
            )
            .sort((a, b) => a.value - b.value)
            .slice(0, 2)
            .map((metric) => ({
              id: metric.topicId as string,
              name: topicsById.get(metric.topicId as string)!.name,
              accuracy: metric.value,
            }));
        })()
      : [];

  const recentActivity = recentActivityQuery.data ?? [];

  function openProtectedRoute(path: '/exams' | '/packages' | '/repeat-pool' | '/learning-progress') {
    if (!isRegistered) {
      router.push('/account-register');
      return;
    }
    router.push(path);
  }

  function handleHeroPress() {
    if (!isRegistered) {
      router.push('/account-register');
      return;
    }
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

  // Same three states and copy as before, restructured into plain
  // variables so the accent-filled hero card below stays flat JSX
  // instead of three nested ternaries.
  let heroPillLabel = 'Başla';
  let heroHeadline = 'Yeni bir konuya başla';
  let heroBody = 'Çalışmaya başlamak için Dersler sekmesinden bir konu seç.';
  let heroIcon: keyof typeof Ionicons.glyphMap = 'arrow-forward-circle-outline';
  let heroAccessibilityLabel = 'Derslere göz at';

  if (!isRegistered) {
    heroPillLabel = 'Giriş';
    heroHeadline = 'Çalışmaya başlamak için hesabını bağla';
    heroBody = 'Dersler, denemeler ve tekrar havuzu kayıtlı hesapla açılır.';
    heroIcon = 'shield-checkmark-outline';
    heroAccessibilityLabel = 'Giriş yap veya kayıt ol';
  } else if (activeSession) {
    heroPillLabel = 'Devam Et';
    heroHeadline = 'Kaldığın yerden devam et';
    heroBody = 'Yarım kalan sınavın seni bekliyor.';
    heroIcon = 'play-circle-outline';
    heroAccessibilityLabel = 'Sınava devam et';
  } else if (repeatPoolCount > 0) {
    heroPillLabel = 'Tekrar Et';
    heroHeadline = `${repeatPoolCount} tekrar sorusu seni bekliyor`;
    heroBody = 'Yanlış yaptığın soruları tekrar çözerek pekiştir.';
    heroIcon = 'refresh-circle-outline';
    heroAccessibilityLabel = 'Tekrar havuzuna git';
  }

  return (
    <ScreenContainer scroll topBar={<TopAppBar />}>
      <View style={styles.header}>
        <AppText variant="footnote" color="tertiary" style={styles.eyebrow}>
          BUGÜN
        </AppText>
        <AppText variant="largeTitle">{getGreeting(new Date().getHours())}</AppText>
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
        <Pressable onPress={handleHeroPress} accessibilityRole="button" accessibilityLabel={heroAccessibilityLabel}>
          {({ pressed }) => (
            <Card variant="hero" style={[styles.heroCard, pressed && styles.heroPressed]}>
              <ImageBackground
                source={studyDeskImage}
                resizeMode="cover"
                style={styles.heroImage}
                imageStyle={styles.heroImageAsset}
              >
                <View style={styles.heroImageOverlay} />
              </ImageBackground>
              <View style={styles.heroContent}>
                <View style={styles.heroPill}>
                  <AppText variant="caption" style={styles.heroPillText}>
                    {heroPillLabel}
                  </AppText>
                </View>
                <AppText variant="title2" style={styles.heroHeadline}>
                  {heroHeadline}
                </AppText>
                <AppText variant="subhead" style={styles.heroBody}>
                  {heroBody}
                </AppText>
                <View style={styles.heroFooter}>
                  <Ionicons name={heroIcon} size={28} color={colors.textOnAccent} />
                </View>
              </View>
            </Card>
          )}
        </Pressable>
      )}

      <AppText variant="title3" style={styles.quickActionsTitle}>
        Hızlı İşlemler
      </AppText>
      <View style={styles.quickActionsRow}>
        <QuickActionTile
          icon="book-outline"
          label="Dersler"
          onPress={() => openProtectedRoute('/exams')}
        />
        <QuickActionTile
          icon="document-text-outline"
          label="Denemeler"
          onPress={() => openProtectedRoute('/packages')}
        />
        <QuickActionTile
          icon="refresh-outline"
          label="Tekrar"
          onPress={() => openProtectedRoute('/repeat-pool')}
        />
      </View>

      {weakTopics.length > 0 ? (
        <View style={styles.weakTopicsSection}>
          <View style={styles.weakTopicsHeader}>
            <AppText variant="title3">Odaklanılacak Konular</AppText>
            <Pressable
              onPress={() => openProtectedRoute('/learning-progress')}
              accessibilityRole="button"
              accessibilityLabel="Tüm konuları gör"
              hitSlop={8}
            >
              <AppText variant="footnote" color="accent">
                Tümünü Gör
              </AppText>
            </Pressable>
          </View>
          <Card style={styles.weakTopicsCard}>
            {weakTopics.map((topic, index) => (
              <View
                key={topic.id}
                style={[
                  styles.weakTopicRow,
                  index !== weakTopics.length - 1 && styles.weakTopicRowDivider,
                ]}
              >
                <View style={styles.weakTopicHeader}>
                  <AppText variant="body" style={styles.weakTopicName} numberOfLines={1}>
                    {topic.name}
                  </AppText>
                  <TopicMasteryChip accuracy={topic.accuracy} />
                </View>
                <View style={styles.weakTopicProgressWrap}>
                  <ProgressBar progress={topic.accuracy} height={4} />
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {recentActivity.length > 0 ? (
        <View style={styles.recentActivitySection}>
          <AppText variant="title3" style={styles.recentActivityTitle}>
            Son Aktivite
          </AppText>
          <Card style={styles.recentActivityCard}>
            {recentActivity.map((item, index) => {
              const display = describeRecentActivityItem(item);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.recentActivityRow,
                    index !== recentActivity.length - 1 && styles.recentActivityRowDivider,
                  ]}
                >
                  <View
                    style={[styles.recentActivityIconCircle, { backgroundColor: display.background }]}
                  >
                    <Ionicons name={display.icon} size={16} color={display.iconColor} />
                  </View>
                  <View style={styles.recentActivityTextWrap}>
                    <AppText variant="body" numberOfLines={1}>
                      {display.title}
                    </AppText>
                    <AppText variant="footnote" color="secondary">
                      {display.subtitle}
                    </AppText>
                  </View>
                  <AppText variant="caption" color="tertiary">
                    {formatRelativeTime(item.occurredAt, new Date())}
                  </AppText>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function QuickActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.quickActionPressable}
    >
      {({ pressed }) => (
        <Card style={[styles.quickActionCard, pressed && styles.quickActionCardPressed]}>
          <IconChip icon={<Ionicons name={icon} size={20} color={colors.accent} />} size={36} />
          <AppText variant="footnote" style={styles.quickActionLabel} numberOfLines={1}>
            {label}
          </AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  eyebrow: { marginBottom: spacing.xs / 2 },
  subtitle: { marginTop: spacing.xs },
  cardBody: { marginTop: spacing.xs },
  skeletonLine: { marginBottom: spacing.sm },
  heroCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accentPressed,
    overflow: 'hidden',
  },
  heroPressed: { opacity: 0.92 },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroImageAsset: { opacity: 0.55 },
  heroImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(53,37,205,0.72)',
  },
  heroContent: { position: 'relative' },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  heroPillText: { color: colors.textOnAccent },
  heroHeadline: { color: colors.textOnAccent },
  heroBody: { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  heroFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg },
  quickActionsTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  quickActionsRow: { flexDirection: 'row', gap: spacing.sm },
  quickActionPressable: { flex: 1 },
  quickActionCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  quickActionCardPressed: { opacity: 0.85 },
  quickActionLabel: { textAlign: 'center' },
  weakTopicsSection: { marginTop: spacing.xl },
  weakTopicsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weakTopicsCard: { paddingVertical: spacing.xs },
  weakTopicRow: { paddingVertical: spacing.sm },
  weakTopicRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  weakTopicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  weakTopicName: { flex: 1 },
  weakTopicProgressWrap: { marginTop: spacing.xs },
  recentActivitySection: { marginTop: spacing.xl },
  recentActivityTitle: { marginBottom: spacing.md },
  recentActivityCard: { paddingVertical: spacing.xs },
  recentActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  recentActivityRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  recentActivityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentActivityTextWrap: { flex: 1 },
});
