import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  usePackageRepository,
  useEntitlementRepository,
  useTrialAccessRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetAllPackagesUseCase } from '../../src/application/GetAllPackagesUseCase';
import type { PackageWithAccess } from '../../src/application/GetPackagesByExamUseCase';
import {
  ScreenContainer,
  AppText,
  Card,
  EmptyState,
  Skeleton,
  TopAppBar,
  IconChip,
  AccessTag,
} from '../../src/components';
import { colors, spacing } from '../../src/theme';

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

export default function PackagesScreen() {
  const packageRepository = usePackageRepository();
  const entitlementRepository = useEntitlementRepository();
  const trialAccessRepository = useTrialAccessRepository();

  const { data: userProfile } = useCurrentUserProfile();

  const {
    data: packages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['packages', 'all', userProfile?.id],
    queryFn: () =>
      new GetAllPackagesUseCase({
        packageRepository,
        entitlementRepository,
        trialAccessRepository,
      }).execute(userProfile!.id),
    enabled: Boolean(userProfile),
  });

  // "Denemeler" is the mock-exam tab — filtered locally after the same
  // GetAllPackagesUseCase call, rather than altering the use case/repository,
  // since Temel Çalışma/Yoğun Tekrar packages belong to Dersler-style
  // practice browsing, not this tab.
  const denemePackages = packages?.filter(
    (entry) => entry.package.packageType === 'ZORLAYICI_DENEME',
  );

  return (
    <ScreenContainer topBar={<TopAppBar />}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AppText variant="largeTitle">Denemeler</AppText>
          {!isLoading && denemePackages && denemePackages.length > 0 ? (
            <AppText variant="footnote" color="tertiary">
              {denemePackages.length} Deneme
            </AppText>
          ) : null}
        </View>
        <AppText variant="subhead" color="secondary" style={styles.subtitle}>
          Gerçek sınav formatında zamanlı denemeler.
        </AppText>
      </View>

      {isLoading || !userProfile ? (
        <View>
          {[0, 1, 2].map((key) => (
            <Card key={key} style={styles.packageCard}>
              <Skeleton width="50%" height={20} style={styles.skeletonTitle} />
              <Skeleton width="35%" height={14} />
            </Card>
          ))}
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="alert-circle-outline"
            title="Denemeler yüklenemedi"
            message="Lütfen daha sonra tekrar dene."
          />
        </View>
      ) : (
        <FlatList
          data={denemePackages}
          keyExtractor={(item) => item.package.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <PackageCard entry={item} />}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <EmptyState
                icon="albums-outline"
                title="Henüz deneme yayınlanmadı"
                message="Yayınlandığında burada görünecek."
              />
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

// A deliberately separate card from src/components/PackageList.tsx's
// PackageRow (cross-exam listing context is slightly different, per
// that file's own header comment) — reuses IconChip/AccessTag from
// there so the visual language matches without merging the two.
function PackageCard({ entry }: { entry: PackageWithAccess }) {
  const { package: pkg, accessStatus } = entry;
  // Curated title (Phase 7A.3.2) takes priority; every existing package
  // has title === null, so this falls back to the exact old label. This
  // is what makes DENEME-001/DENEME-002-style packages distinguishable
  // instead of both reading "Zorlayıcı Deneme".
  const displayTitle = pkg.title ?? packageTypeLabel[pkg.packageType] ?? pkg.packageType;

  return (
    <Pressable
      onPress={() => router.push(`/package/${pkg.id}`)}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${displayTitle}, ${difficultyLabel[pkg.difficultyLevel] ?? pkg.difficultyLevel}${pkg.isFreeTier ? ', ücretsiz' : ''}`}
    >
      <Card style={styles.packageCard}>
        <View style={styles.row}>
          <IconChip icon={<Ionicons name="timer-outline" size={20} color={colors.accent} />} size={40} />
          <View style={styles.rowBody}>
            <View style={styles.packageHeader}>
              <AppText variant="headline" numberOfLines={1} style={styles.titleText}>
                {displayTitle}
              </AppText>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
            <AppText variant="footnote" color="tertiary" style={styles.packageMeta}>
              {difficultyLabel[pkg.difficultyLevel] ?? pkg.difficultyLevel}
            </AppText>
            <AccessTag isFreeTier={pkg.isFreeTier} accessStatus={accessStatus} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  subtitle: { marginTop: spacing.xs },
  listContent: { flexGrow: 1, paddingBottom: spacing.xl },
  packageCard: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowBody: { flex: 1 },
  packageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleText: { flex: 1, marginRight: spacing.sm },
  packageMeta: { marginTop: spacing.xs / 2 },
  skeletonTitle: { marginBottom: spacing.sm },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
