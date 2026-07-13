import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  usePackageRepository,
  useEntitlementRepository,
  useTrialAccessRepository,
  useQuestionRepository,
  useTopicRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPackageByIdUseCase } from '../../src/application/GetPackageByIdUseCase';
import { GetPackagesByExamUseCase } from '../../src/application/GetPackagesByExamUseCase';
import { GetQuestionsByPackageUseCase } from '../../src/application/GetQuestionsByPackageUseCase';
import { GetTopicsByExamUseCase } from '../../src/application/GetTopicsByExamUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  Skeleton,
  EmptyState,
  PrimaryButton,
  BackButton,
  IconChip,
  AccessTag,
  packageTypeIcon,
} from '../../src/components';
import { colors, radii, spacing } from '../../src/theme';

const packageTypeLabel: Record<string, string> = {
  TEMEL_CALISMA: 'Temel Çalışma',
  YOGUN_TEKRAR: 'Yoğun Tekrar',
  ZORLAYICI_DENEME: 'Zorlayıcı Deneme',
};

const difficultyLabel: Record<string, string> = {
  KOLAY: 'Kolay',
  ORTA: 'Orta',
  ZOR: 'Zor',
};

// Fallback narrative for packages with no curated description (Phase
// 7A.3.2 added packages.title/description, but they're optional — most
// packages still have none). package_type + difficulty_level already
// determine a short, honest one-line framing, generated client-side the
// same way Exam Detail's stats card narrative is generated rather than
// stored.
const packageTypeNarrative: Record<string, string> = {
  TEMEL_CALISMA: 'Temel kavramları düzenli ve sakin bir tempoda çalışman için hazırlandı.',
  YOGUN_TEKRAR: 'Bildiklerini pekiştirmek ve zayıf noktalarını tekrar etmek için yoğun bir set.',
  ZORLAYICI_DENEME: 'Gerçek sınav formatına yakın, zamanlı bir deneme sınavı.',
};

// Real, verifiable behavior only — practice rows match
// app/question/[packageId].tsx's actual behavior (getOptionState reveals
// correct/incorrect immediately on submit; no timer/duration state
// exists anywhere in that screen). ZORLAYICI_DENEME rows intentionally
// match app/exam-start/[packageId].tsx's already-verified "Sınav
// Kuralları" copy word-for-word (shown again here, one step earlier,
// before the user even reaches that confirmation screen) rather than
// inventing separate wording for the same real behavior.
const packageRules: Record<string, string[]> = {
  TEMEL_CALISMA: [
    'Her sorudan hemen sonra doğru cevabı görürsün.',
    'Süre sınırı yoktur, kendi hızında ilerleyebilirsin.',
  ],
  YOGUN_TEKRAR: [
    'Her sorudan hemen sonra doğru cevabı görürsün.',
    'Süre sınırı yoktur, kendi hızında ilerleyebilirsin.',
  ],
  ZORLAYICI_DENEME: [
    'Sınava başladığında süre geri sayımı hemen başlar.',
    'Cevabın, bir sonraki soruya geçtiğinde kaydedilir.',
    'Tüm soruları yanıtlamadan sınavı bitirebilirsin; boş bıraktıkların yanlış sayılmaz.',
    'Sonucun ve analizin, sınavı bitirdiğinde gösterilir.',
  ],
};

// accessStatus is derived by reusing GetPackagesByExamUseCase (already
// approved) rather than introducing a new "package with access" use
// case — fetches the exam's full package list and finds this one's
// entry. Slightly more than strictly needed for one package, but it
// keeps data access to only pre-approved use cases.
export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const packageRepository = usePackageRepository();
  const entitlementRepository = useEntitlementRepository();
  const trialAccessRepository = useTrialAccessRepository();
  const questionRepository = useQuestionRepository();
  const topicRepository = useTopicRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const packageQuery = useQuery({
    queryKey: ['package', id],
    queryFn: () => new GetPackageByIdUseCase({ packageRepository }).execute(id as string),
    enabled: Boolean(id),
  });

  // Real question count, same use case Exam Start already uses for
  // Deneme packages — shown here too so practice packages aren't the
  // only ones missing it. Never fabricated: appended to the meta line
  // only when the local cache actually has visible package content.
  const questionsQuery = useQuery({
    queryKey: ['questions', 'byPackage', id],
    queryFn: () => new GetQuestionsByPackageUseCase({ questionRepository }).execute(id as string),
    enabled: Boolean(id),
  });
  const questionCount = questionsQuery.data?.length;
  const visibleQuestionCount = questionCount && questionCount > 0 ? questionCount : null;

  // Real per-topic question counts within this package — grouped from
  // the same questions already fetched above, names resolved from the
  // exam's real topic list (same use case the question screens already
  // use for their topic breadcrumb). A topicId missing from that list
  // is skipped rather than shown with a fabricated name.
  const topicsQuery = useQuery({
    queryKey: ['topics', 'byExam', packageQuery.data?.examId],
    queryFn: () => new GetTopicsByExamUseCase({ topicRepository }).execute(packageQuery.data!.examId),
    enabled: Boolean(packageQuery.data),
  });

  const topicDistribution = useMemo(() => {
    if (!questionsQuery.data || !topicsQuery.data) return null;
    const topicNameById = new Map(topicsQuery.data.map((topic) => [topic.id, topic.name]));
    const countByTopicId = new Map<string, number>();
    for (const question of questionsQuery.data) {
      countByTopicId.set(question.topicId, (countByTopicId.get(question.topicId) ?? 0) + 1);
    }
    return Array.from(countByTopicId.entries())
      .map(([topicId, count]) => ({ topicId, name: topicNameById.get(topicId), count }))
      .filter((entry): entry is { topicId: string; name: string; count: number } => Boolean(entry.name))
      .sort((a, b) => b.count - a.count);
  }, [questionsQuery.data, topicsQuery.data]);

  const accessQuery = useQuery({
    queryKey: ['packages', 'byExam', packageQuery.data?.examId, userProfile?.id],
    queryFn: () =>
      new GetPackagesByExamUseCase({
        packageRepository,
        entitlementRepository,
        trialAccessRepository,
      }).execute(userProfile!.id, packageQuery.data!.examId),
    enabled: Boolean(packageQuery.data) && Boolean(userProfile),
  });

  const accessEntry = accessQuery.data?.find((entry) => entry.package.id === id);
  const accessStatus = accessEntry?.accessStatus ?? null;

  // package_type is the existing mode signal — ZORLAYICI_DENEME now
  // routes to the pre-start confirmation screen (Phase 3B.3), which is
  // what calls StartExamSessionUseCase; Package Detail itself no longer
  // starts a Deneme session directly. Practice packages still route
  // straight into the Question Screen, unchanged.
  function handleStart() {
    if (!packageQuery.data) return;
    const pkg = packageQuery.data;

    if (pkg.packageType === 'ZORLAYICI_DENEME') {
      router.push({
        pathname: '/exam-start/[packageId]',
        params: { packageId: pkg.id, examId: pkg.examId },
      });
      return;
    }

    router.push(`/question/${pkg.id}`);
  }

  // TRIAL is only ever reached for TEMEL_CALISMA/YOGUN_TEKRAR (Deneme
  // packages are always FULL or LOCKED — see resolvePackageAccessStatus)
  // so this always routes into the lazy Question Screen flow, never the
  // Deneme session flow above. accessMode='trial' is what makes
  // QuestionScreen use GetTrialQuestionByIndexUseCase instead of the
  // eager GetQuestionsByPackageUseCase fetch.
  function handleStartTrial() {
    if (!packageQuery.data) return;
    const pkg = packageQuery.data;
    router.push({
      pathname: '/question/[packageId]',
      params: { packageId: pkg.id, examId: pkg.examId, accessMode: 'trial' },
    });
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      {packageQuery.isLoading ? (
        <Card variant="hero">
          <Skeleton width="60%" height={22} style={styles.skeletonLine} />
          <Skeleton width="40%" height={16} style={styles.skeletonLine} />
          <Skeleton width="100%" height={50} borderRadius={radii.sm} />
        </Card>
      ) : packageQuery.error || !packageQuery.data ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Paket bulunamadı"
            message="Bu paket artık mevcut olmayabilir."
          />
        </View>
      ) : (
        <>
        <Card variant="hero">
          <View style={styles.titleRow}>
            <IconChip
              icon={
                <Ionicons
                  name={packageTypeIcon[packageQuery.data.packageType] ?? 'albums-outline'}
                  size={22}
                  color={colors.accent}
                />
              }
              size={44}
            />
            <View style={styles.titleTextWrap}>
              <AppText variant="title2">
                {packageQuery.data.title ?? packageTypeLabel[packageQuery.data.packageType] ?? packageQuery.data.packageType}
              </AppText>
              <AppText variant="subhead" color="secondary" style={styles.metaLine}>
                {difficultyLabel[packageQuery.data.difficultyLevel] ?? packageQuery.data.difficultyLevel}
                {visibleQuestionCount ? ` · ${visibleQuestionCount} Soru` : ''}
              </AppText>
            </View>
          </View>

          {accessStatus !== null ? (
            <AccessTag isFreeTier={packageQuery.data.isFreeTier} accessStatus={accessStatus} />
          ) : null}

          {/* Curated description (Phase 7A.3.2) takes priority over the
              generic package_type narrative when present -- showing both
              would be redundant. Every existing package has
              description === null, so this falls back to the exact old
              narrative text. */}
          <AppText variant="body" color="secondary" style={styles.narrative}>
            {packageQuery.data.description ?? packageTypeNarrative[packageQuery.data.packageType] ?? ''}
          </AppText>

          {accessStatus === null ? (
            <Skeleton
              width="100%"
              height={50}
              borderRadius={radii.sm}
              style={styles.ctaSkeleton}
            />
          ) : accessStatus === 'FULL' ? (
            <>
              <AppText variant="subhead" color="success" style={styles.accessNote}>
                Bu pakete erişimin var
              </AppText>
              <PrimaryButton label="Başla" onPress={handleStart} />
            </>
          ) : accessStatus === 'TRIAL' ? (
            <>
              <AppText variant="subhead" color="secondary" style={styles.accessNote}>
                Bu paketten ücretsiz birkaç soru deneyebilirsin
              </AppText>
              <PrimaryButton label="Ücretsiz Dene" onPress={handleStartTrial} />
            </>
          ) : (
            // No disabled-but-styled-as-tappable button here on purpose —
            // a disabled "Kilidi Aç" reads as broken, not as "coming soon".
            // Same honest "Yakında" pill Settings/About already use instead,
            // since there is no purchase flow to route into yet.
            <View style={styles.lockedNotice}>
              <AppText variant="subhead" color="secondary" style={styles.accessNote}>
                Bu paket şu anda kilitli
              </AppText>
              <View style={styles.comingSoonTag}>
                <AppText variant="caption" color="tertiary">
                  Yakında
                </AppText>
              </View>
              <AppText variant="footnote" color="tertiary" style={styles.comingSoonNote}>
                Premium özellikler yakında eklenecek.
              </AppText>
            </View>
          )}
        </Card>

        {topicDistribution && topicDistribution.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="title3" style={styles.sectionTitle}>
              Soru Dağılımı
            </AppText>
            <Card>
              {topicDistribution.map((entry, index) => (
                <View
                  key={entry.topicId}
                  style={[
                    styles.distributionRow,
                    index !== topicDistribution.length - 1 && styles.distributionRowDivider,
                  ]}
                >
                  <AppText variant="body" style={styles.distributionName} numberOfLines={1}>
                    {entry.name}
                  </AppText>
                  <AppText
                    variant="subhead"
                    color="secondary"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {entry.count} Soru
                  </AppText>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {(packageRules[packageQuery.data.packageType] ?? []).length > 0 ? (
          <View style={styles.section}>
            <AppText variant="title3" style={styles.sectionTitle}>
              Kurallar
            </AppText>
            <Card>
              {packageRules[packageQuery.data.packageType].map((rule, index, rules) => (
                <View
                  key={rule}
                  style={[styles.ruleRow, index !== rules.length - 1 && styles.ruleRowDivider]}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                  <AppText variant="body" style={styles.ruleText}>
                    {rule}
                  </AppText>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleTextWrap: { flex: 1 },
  metaLine: { marginTop: spacing.xs / 2 },
  narrative: { marginTop: spacing.md, marginBottom: spacing.lg },
  accessNote: { marginBottom: spacing.md },
  lockedNotice: { alignItems: 'center' },
  comingSoonTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  comingSoonNote: { marginTop: spacing.sm, textAlign: 'center' },
  skeletonLine: { marginBottom: spacing.sm },
  ctaSkeleton: { marginTop: spacing.md },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  section: { marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  distributionRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  distributionName: { flex: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  ruleRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ruleText: { flex: 1 },
});
