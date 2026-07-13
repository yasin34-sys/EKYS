import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuthService,
  useCurrentUserProfile,
  useUserProfileRepository,
} from '../src/services/hooks';
import { LogoutUseCase } from '../src/application/LogoutUseCase';
import {
  AppText,
  BackButton,
  Card,
  IconChip,
  ScreenContainer,
  SecondaryButton,
} from '../src/components';
import { colors, radii, spacing } from '../src/theme';

const SUPPORT_EMAIL = 'ekysceptedestek@gmail.com';

function StatusTag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'danger' }) {
  return (
    <View style={[styles.statusTag, tone === 'danger' && styles.statusTagDanger]}>
      <AppText variant="caption" color={tone === 'danger' ? 'danger' : 'tertiary'}>
        {label}
      </AppText>
    </View>
  );
}

function ActionInfoCard({
  icon,
  title,
  message,
  status,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  status: string;
  danger?: boolean;
}) {
  return (
    <Card style={styles.actionCard}>
      <View style={styles.actionHeader}>
        <IconChip
          icon={<Ionicons name={icon} size={18} color={danger ? colors.danger : colors.accent} />}
          size={36}
        />
        <View style={styles.actionText}>
          <AppText variant="headline">{title}</AppText>
          <AppText variant="footnote" color="secondary" style={styles.actionMessage}>
            {message}
          </AppText>
        </View>
        <StatusTag label={status} tone={danger ? 'danger' : 'neutral'} />
      </View>
    </Card>
  );
}

export default function AccountManagementScreen() {
  const authService = useAuthService();
  const userProfileRepository = useUserProfileRepository();
  const queryClient = useQueryClient();
  const { data: userProfile } = useCurrentUserProfile();
  const isRegistered = userProfile?.accountStatus === 'REGISTERED';
  const statusLabel = isRegistered ? 'Kayıtlı hesap' : 'Hesap bağlanmadı';

  const [loggingOut, setLoggingOut] = useState(false);

  function openSupportEmail() {
    const subject = encodeURIComponent('EKYS CEPTE hesap desteği');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {});
  }

  async function performLogout() {
    if (!userProfile) return;
    setLoggingOut(true);
    try {
      await new LogoutUseCase({ authService, userProfileRepository }).execute({
        userId: userProfile.id,
      });
      // Broad clear, not a narrow invalidation: the cache may hold
      // REGISTERED-user data (profile, dashboard metrics, exam sessions,
      // entitlements) keyed by the just-cleared user id. A targeted
      // invalidate list would need updating every time a screen adds a
      // new user-scoped query, and a missed key would let stale data
      // flash for the new anonymous session. clear() is the same
      // "err on the broad side" choice _layout.tsx already makes for
      // post-bootstrap sync.
      queryClient.clear();
      router.replace('/');
    } catch (error) {
      Alert.alert('İşlem tamamlanamadı', 'Çıkış yapılamadı. Lütfen tekrar dene.');
    } finally {
      setLoggingOut(false);
    }
  }

  function handleLogoutPress() {
    Alert.alert(
      'Çıkış Yap',
      'Bu cihazdaki oturumun kapatılacak ve yerel ilerleme verilerin bu cihazdan silinecek. Hesabın ve sunucudaki verilerin korunur. Devam etmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: performLogout },
      ],
    );
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <Card variant="hero" style={styles.heroCard}>
        <View style={styles.heroTop}>
          <IconChip icon={<Ionicons name="person-circle-outline" size={24} color={colors.accent} />} size={52} />
          <View style={styles.heroText}>
            <AppText variant="title2">Hesap Yönetimi</AppText>
            <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
              Çıkış ve hesap silme akışları burada toplanacak. Şu an güvenli olmayan
              yarım işlemler yerine durum açıkça gösteriliyor.
            </AppText>
          </View>
        </View>
        <View style={styles.currentStatusRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
          <AppText variant="caption" color="secondary">
            {statusLabel}
          </AppText>
        </View>
      </Card>

      {isRegistered ? (
        <Card style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <IconChip
              icon={<Ionicons name="log-out-outline" size={18} color={colors.accent} />}
              size={36}
            />
            <View style={styles.actionText}>
              <AppText variant="headline">Çıkış Yap</AppText>
              <AppText variant="footnote" color="secondary" style={styles.actionMessage}>
                Bu cihazdaki oturumun kapatılır ve yerel ilerleme verilerin bu cihazdan silinir.
                Hesabın ve sunucudaki verilerin korunur.
              </AppText>
            </View>
          </View>
          <View style={styles.actionButtonWrap}>
            <SecondaryButton
              label={loggingOut ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
              onPress={handleLogoutPress}
              disabled={loggingOut}
            />
          </View>
        </Card>
      ) : null}

      <ActionInfoCard
        icon="trash-outline"
        title="Hesabı Sil"
        status="Mağaza için gerekli"
        danger
        message="Hesap oluşturma yayına alınmadan önce, kullanıcı uygulama içinden hesap silmeyi başlatabilmeli. Google Play için ayrıca web üzerinden erişilebilir bir silme bağlantısı da gerekecek."
      />

      <Card style={styles.supportCard}>
        <View style={styles.supportHeader}>
          <Ionicons name="mail-outline" size={18} color={colors.accent} />
          <AppText variant="headline">Destek</AppText>
        </View>
        <AppText variant="footnote" color="secondary" style={styles.supportCopy}>
          Hesap ve veri talepleri için destek e-postası hazır. Bu, ilerideki gerçek hesap
          silme akışının yerine geçmeyecek; sadece iletişim kanalıdır.
        </AppText>
        <SecondaryButton label="Destek e-postası aç" onPress={openSupportEmail} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  heroCard: { marginBottom: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroText: { flex: 1 },
  heroCopy: { marginTop: spacing.xs },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  actionCard: { marginBottom: spacing.md },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  actionText: { flex: 1 },
  actionMessage: { marginTop: spacing.xs },
  actionButtonWrap: { marginTop: spacing.md },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  statusTagDanger: { backgroundColor: colors.dangerMuted },
  supportCard: { gap: spacing.md, marginTop: spacing.sm },
  supportHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supportCopy: { marginBottom: spacing.xs },
});
