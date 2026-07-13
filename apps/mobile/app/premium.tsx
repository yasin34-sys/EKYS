import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserProfile } from '../src/services/hooks';
import {
  ScreenContainer,
  AppText,
  BackButton,
  Card,
  AccountRequiredState,
  PrimaryButton,
} from '../src/components';
import {
  DEFAULT_PREMIUM_PLAN_ID,
  PREMIUM_PLANS,
  type PremiumPlan,
  type PremiumPlanId,
} from '../src/billing/premiumPlans';
import { colors, radii, spacing } from '../src/theme';

export default function PremiumScreen() {
  const { packageId } = useLocalSearchParams<{ packageId?: string; examId?: string }>();
  const { data: userProfile, isLoading: isUserProfileLoading } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';
  const [selectedPlanId, setSelectedPlanId] =
    useState<PremiumPlanId>(DEFAULT_PREMIUM_PLAN_ID);

  const selectedPlan = useMemo(
    () => PREMIUM_PLANS.find((plan) => plan.id === selectedPlanId) ?? PREMIUM_PLANS[0],
    [selectedPlanId],
  );

  const accountNote =
    isRegistered
      ? 'Satın alma bu hesaba bağlanacak.'
      : 'Satın alma açılmadan önce hesabını kaydetmen gerekecek.';

  if (!isUserProfileLoading && !isRegistered) {
    return (
      <ScreenContainer scroll>
        <View style={styles.headerRow}>
          <BackButton />
        </View>
        <AccountRequiredState message="Premium planları görüntülemek için hesabını e-posta ile bağla." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <Card variant="hero" style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.goldChip}>
            <Ionicons name="sparkles-outline" size={24} color={colors.gold} />
          </View>
          <View style={styles.heroText}>
            <AppText variant="title2">Premium Süreli Erişim</AppText>
            <AppText variant="subhead" color="secondary" style={styles.heroSubtitle}>
              Konu sınavlarını ve ücretli denemeleri seçtiğin süre boyunca aç.
            </AppText>
          </View>
        </View>

        <View style={styles.promiseList}>
          <PromiseRow icon="albums-outline" text="Tüm premium konu sınavlarına erişim" />
          <PromiseRow icon="timer-outline" text="Ücretli deneme sınavlarını çözme hakkı" />
          <PromiseRow icon="cloud-done-outline" text="Erişim sunucuda doğrulanır, cihazda sadece kopyası tutulur" />
        </View>
      </Card>

      <View style={styles.section}>
        <AppText variant="title3" style={styles.sectionTitle}>
          Planını Seç
        </AppText>
        {PREMIUM_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={plan.id === selectedPlanId}
            onPress={() => setSelectedPlanId(plan.id)}
          />
        ))}
      </View>

      <Card style={styles.checkoutCard}>
        <View style={styles.checkoutHeader}>
          <View>
            <AppText variant="headline">{selectedPlan.title}</AppText>
            <AppText variant="footnote" color="tertiary" style={styles.checkoutMeta}>
              Tek seferlik süreli erişim
            </AppText>
          </View>
          <AppText variant="title3" style={styles.checkoutPrice}>
            {selectedPlan.price}
          </AppText>
        </View>
        <AppText variant="subhead" color="secondary" style={styles.checkoutCopy}>
          {accountNote}
        </AppText>
        {packageId ? (
          <AppText variant="footnote" color="tertiary" style={styles.checkoutCopy}>
            Satın alma tamamlandığında geldiğin sınav otomatik açılacak.
          </AppText>
        ) : null}
        <PrimaryButton label="Satın alma yakında" disabled />
        <AppText variant="footnote" color="tertiary" style={styles.storeNote}>
          Mobil satın alma App Store ve Google Play ödeme sistemiyle bağlanacak. Google Pay,
          Android’de Play ödeme seçeneklerinden biri olarak görünebilir; ayrı bir dış ödeme
          butonu eklenmeyecek.
        </AppText>
      </Card>
    </ScreenContainer>
  );
}

function PromiseRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.promiseRow}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <AppText variant="subhead" color="secondary" style={styles.promiseText}>
        {text}
      </AppText>
    </View>
  );
}

function PlanCard({
  plan,
  selected,
  onPress,
}: {
  plan: PremiumPlan;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.title}, ${plan.price}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={[styles.planCard, selected && styles.planCardSelected]}>
        <View style={styles.planRow}>
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? <View style={styles.radioDot} /> : null}
          </View>
          <View style={styles.planBody}>
            <View style={styles.planTitleRow}>
              <AppText variant="headline" style={styles.planTitle}>
                {plan.title}
              </AppText>
              {plan.featured ? (
                <View style={styles.featuredTag}>
                  <AppText variant="caption" style={styles.featuredText}>
                    En avantajlı
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="footnote" color="tertiary" style={styles.planDuration}>
              {plan.duration}
            </AppText>
            <AppText variant="subhead" color="secondary" style={styles.planNote}>
              {plan.note}
            </AppText>
          </View>
          <AppText variant="title3" style={styles.planPrice}>
            {plan.price}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  heroCard: { marginBottom: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goldChip: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroSubtitle: { marginTop: spacing.xs },
  promiseList: { marginTop: spacing.lg, gap: spacing.sm },
  promiseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  promiseText: { flex: 1 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  planCard: { marginBottom: spacing.md, borderColor: colors.border },
  planCardSelected: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.gold },
  radioDot: { width: 10, height: 10, borderRadius: radii.full, backgroundColor: colors.gold },
  planBody: { flex: 1 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  planTitle: { flexShrink: 1 },
  featuredTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  featuredText: { color: colors.gold },
  planDuration: { marginTop: spacing.xs / 2 },
  planNote: { marginTop: spacing.xs },
  planPrice: { color: colors.textPrimary, flexShrink: 0 },
  checkoutCard: { marginBottom: spacing.xl },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  checkoutMeta: { marginTop: spacing.xs / 2 },
  checkoutPrice: { color: colors.gold },
  checkoutCopy: { marginBottom: spacing.md },
  storeNote: { marginTop: spacing.md, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
