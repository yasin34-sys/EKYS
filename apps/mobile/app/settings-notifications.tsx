import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, BackButton, Card, IconChip, ScreenContainer } from '../src/components';
import { colors, radii, spacing } from '../src/theme';

function NotificationPlanCard({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <Card style={styles.planCard}>
      <View style={styles.planHeader}>
        <IconChip icon={<Ionicons name={icon} size={18} color={colors.accent} />} size={36} />
        <View style={styles.planText}>
          <AppText variant="headline">{title}</AppText>
          <AppText variant="footnote" color="secondary" style={styles.planMessage}>
            {message}
          </AppText>
        </View>
        <View style={styles.statusTag}>
          <AppText variant="caption" color="tertiary">
            Planlandı
          </AppText>
        </View>
      </View>
    </Card>
  );
}

export default function SettingsNotificationsScreen() {
  return (
    <ScreenContainer scroll>
      <View style={styles.headerRow}>
        <BackButton />
      </View>

      <Card variant="hero" style={styles.heroCard}>
        <View style={styles.heroTop}>
          <IconChip icon={<Ionicons name="notifications-outline" size={24} color={colors.accent} />} size={52} />
          <View style={styles.heroText}>
            <AppText variant="title2">Bildirim Tercihleri</AppText>
            <AppText variant="subhead" color="secondary" style={styles.heroCopy}>
              Bildirimler izin isteyen bir sistem davranışı olduğu için, önce gerçek hatırlatma
              altyapısı kurulacak; sonra kullanıcı buradan hangi bildirimleri alacağını seçecek.
            </AppText>
          </View>
        </View>
      </Card>

      <NotificationPlanCard
        icon="calendar-outline"
        title="Çalışma hatırlatmaları"
        message="Günlük çalışma hatırlatmaları için cihaz bildirimi, izin akışı ve sessiz saat tercihi birlikte bağlanmalı."
      />
      <NotificationPlanCard
        icon="timer-outline"
        title="Deneme hatırlatmaları"
        message="Deneme sınavı planlama özelliği eklendiğinde, yaklaşan denemeler için ayrı tercih burada yönetilecek."
      />
      <Card style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <AppText variant="footnote" color="secondary" style={styles.noteText}>
          Play Store ve App Store bildirimleri kendileri sağlamaz; uygulama içinde izin isteyen
          bir bildirim altyapısı kurulur, kullanıcı da istediği zaman sistem ayarlarından kapatabilir.
        </AppText>
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
  planCard: { marginBottom: spacing.md },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  planText: { flex: 1 },
  planMessage: { marginTop: spacing.xs },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSecondary,
  },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  noteText: { flex: 1 },
});
