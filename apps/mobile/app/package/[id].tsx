import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  usePackageRepository,
  useEntitlementRepository,
  useTrialAccessRepository,
  useQuestionRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetPackageByIdUseCase } from '../../src/application/GetPackageByIdUseCase';
import { GetPackagesByExamUseCase } from '../../src/application/GetPackagesByExamUseCase';
import { GetQuestionsByPackageUseCase } from '../../src/application/GetQuestionsByPackageUseCase';
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

// Package has no stored description (see PHYSICAL_DATABASE_SCHEMA.md) —
// package_type + difficulty_level already fully determine a short, honest
// one-line framing, generated client-side the same way Exam Detail's stats
// card narrative is generated rather than stored.
const packageTypeNarrative: Record<string, string> = {
  TEMEL_CALISMA: 'Temel kavramları düzenli ve sakin bir tempoda çalışman için hazırlandı.',
  YOGUN_TEKRAR: 'Bildiklerini pekiştirmek ve zayıf noktalarını tekrar etmek için yoğun bir set.',
  ZORLAYICI_DENEME: 'Gerçek sınav formatına yakın, zamanlı bir deneme sınavı.',
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

  const { data: userProfile } = useCurrentUserProfile();

  const packageQuery = useQuery({
    queryKey: ['package', id],
    queryFn: () => new GetPackageByIdUseCase({ packageRepository }).execute(id as string),
    enabled: Boolean(id),
  });

  // Real question count, same use case Exam Start already uses for
  // Deneme packages — shown here too so practice packages aren't the
  // only ones missing it. Never fabricated: appended to the meta line
  // only once this query actually resolves (see render below).
  const questionsQuery = useQuery({
    queryKey: ['questions', 'byPackage', id],
    queryFn: () => new GetQuestionsByPackageUseCase({ questionRepository }).execute(id as string),
    enabled: Boolean(id),
  });
  const questionCount = questionsQuery.data?.length;

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
                {packageTypeLabel[packageQuery.data.packageType] ?? packageQuery.data.packageType}
              </AppText>
              <AppText variant="subhead" color="secondary" style={styles.metaLine}>
                {difficultyLabel[packageQuery.data.difficultyLevel] ?? packageQuery.data.difficultyLevel}
                {questionCount !== undefined ? ` · ${questionCount} Soru` : ''}
              </AppText>
            </View>
          </View>

          {accessStatus !== null ? (
            <AccessTag isFreeTier={packageQuery.data.isFreeTier} accessStatus={accessStatus} />
          ) : null}

          <AppText variant="body" color="secondary" style={styles.narrative}>
            {packageTypeNarrative[packageQuery.data.packageType] ?? ''}
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
            <>
              <AppText variant="subhead" color="secondary" style={styles.accessNote}>
                Bu paketin kilidini açman gerekiyor
              </AppText>
              <PrimaryButton label="Kilidi Aç" disabled />
              <AppText variant="footnote" color="tertiary" style={styles.comingSoonNote}>
                Premium özellikler yakında eklenecek.
              </AppText>
            </>
          )}
        </Card>
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
  comingSoonNote: { marginTop: spacing.sm, textAlign: 'center' },
  skeletonLine: { marginBottom: spacing.sm },
  ctaSkeleton: { marginTop: spacing.md },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
});
