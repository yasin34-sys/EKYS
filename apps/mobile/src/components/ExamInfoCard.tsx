import { StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Card } from './Card';
import { spacing } from '../theme';
import type { Exam } from '../domain';

export interface ExamInfoCardProps {
  exam: Exam;
}

// Purely presentational, extracted from Exam Detail — the
// loading/error decision about whether this renders at all stays in
// the screen, unchanged.
export function ExamInfoCard({ exam }: ExamInfoCardProps) {
  return (
    <Card variant="hero" style={styles.card}>
      <AppText variant="title2">{exam.name}</AppText>
      <AppText variant="subhead" color="secondary" style={styles.statsLine}>
        Bu sınavda {exam.questionCount} soru var, ortalama {exam.durationMinutes} dakika sürer.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xl },
  statsLine: { marginTop: spacing.xs },
});
