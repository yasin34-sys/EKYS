import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppText } from './AppText';
import { Card } from './Card';
import { Skeleton } from './Skeleton';
import { colors, radii, spacing } from '../theme';
import type { PackageWithAccess } from '../application/GetPackagesByExamUseCase';

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

export interface PackageListProps {
  isLoading: boolean;
  packages: PackageWithAccess[] | undefined;
}

// Extracted from Exam Detail — same loading/empty/loaded branching and
// navigation behavior, unchanged, just moved into its own file.
// Deliberately not shared with (tabs)/packages.tsx's own card, which
// has slightly different context (cross-exam listing) — unifying them
// wasn't part of this refactor's scope.
export function PackageList({ isLoading, packages }: PackageListProps) {
  return (
    <View style={styles.section}>
      <AppText variant="title3" style={styles.sectionTitle}>
        Paketler
      </AppText>
      {isLoading ? (
        <Card style={styles.packageCard}>
          <Skeleton width="50%" height={20} style={styles.skeletonRow} />
          <Skeleton width="35%" height={14} />
        </Card>
      ) : packages && packages.length > 0 ? (
        packages.map((entry) => <PackageRow key={entry.package.id} entry={entry} />)
      ) : (
        <Card>
          <AppText variant="subhead" color="tertiary">
            Bu sınav için henüz paket yayınlanmadı.
          </AppText>
        </Card>
      )}
    </View>
  );
}

function PackageRow({ entry }: { entry: PackageWithAccess }) {
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
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  skeletonRow: { marginBottom: spacing.sm },
  packageCard: { marginBottom: spacing.md },
  packageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  packageMeta: { marginTop: spacing.xs },
  freeTag: {
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  pressed: { opacity: 0.7 },
});
