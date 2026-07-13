import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserProfile } from '../src/services/hooks';
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
  const { data: userProfile } = useCurrentUserProfile();
  const statusLabel = userProfile?.accountStatus === 'REGISTERED' ? 'Kayıtlı hesap' : 'Hesap bağlanmadı';

  function openSupportEmail() {
    const subject = encodeURIComponent('EKYS CEPTE hesap desteği');
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {});
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

      <ActionInfoCard
        icon="log-out-outline"
        title="Çıkış Yap"
        status="Hazırlanıyor"
        message="Güvenli çıkış için doğrulanmış giriş ekranı ve yerel SQLite verisini tutarlı sıfırlama akışı birlikte tamamlanmalı. Sadece Supabase oturumunu kapatmak bu cihazdaki ilerleme verisini boşa düşürebilir."
      />

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
