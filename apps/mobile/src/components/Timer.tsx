import { AppText } from './AppText';

export interface TimerProps {
  remainingSeconds: number;
}

const FINAL_MOMENTS_THRESHOLD_SECONDS = 60;

// Tabular figures (Design System §6) so the digits don't jitter as
// they change. Color shifts subtly through the hierarchy only in the
// final minute — never a flashing alarm, which would manufacture
// panic rather than focus (§26). No separate "warning" token exists
// in the palette, so this reuses `danger` (already muted, not neon)
// rather than inventing a new color category.
export function Timer({ remainingSeconds }: TimerProps) {
  const clamped = Math.max(0, remainingSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const isFinalMoments = clamped <= FINAL_MOMENTS_THRESHOLD_SECONDS;

  return (
    <AppText
      variant="headline"
      color={isFinalMoments ? 'danger' : 'secondary'}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </AppText>
  );
}
