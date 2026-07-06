import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  usePackageRepository,
  useEntitlementRepository,
  useTrialAccessRepository,
  useCurrentUserProfile,
} from '../../src/services/hooks';
import { GetAllPackagesUseCase } from '../../src/application/GetAllPackagesUseCase';
import type { PackageWithAccess } from '../../src/application/GetPackagesByExamUseCase';
import { ScreenContainer, AppText, Card, EmptyState, Skeleton, TopAppBar } from '../../src/components';
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
        <AppText variant="largeTitle">Denemeler</AppText>
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

function PackageCard({ entry }: { entry: PackageWithAccess }) {
  const { package: pkg } = entry;
  return (
    <Pressable
      onPress={() => router.push(`/package/${pkg.id}`)}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${packageTypeLabel[pkg.packageType] ?? pkg.packageType}, ${difficultyLabel[pkg.difficultyLevel] ?? pkg.difficultyLevel}${pkg.isFreeTier ? ', ücretsiz' : ''}`}
    >
      <Card style={styles.packageCard}>
        <View style={styles.packageHeader}>
          <AppText variant="headline">{packageTypeLabel[pkg.packageType] ?? pkg.packageType}</AppText>
          {pkg.isFreeTier ? (
            <View style={styles.freeTag}>
              <AppText variant="caption" color="accent">
                Ücretsiz
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="footnote" color="tertiary" style={styles.packageMeta}>
          {difficultyLabel[pkg.difficultyLevel] ?? pkg.difficultyLevel}
        </AppText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.lg },
  listContent: { flexGrow: 1, paddingBottom: spacing.xl },
  packageCard: { marginBottom: spacing.md },
  packageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  packageMeta: { marginTop: spacing.xs },
  skeletonTitle: { marginBottom: spacing.sm },
  freeTag: {
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
