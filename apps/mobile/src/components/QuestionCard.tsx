import { AppText } from './AppText';
import { Card } from './Card';

export interface QuestionCardProps {
  body: string;
}

// Spacious, generous line-height, comfortable reading width — the
// question body is the most important text on screen and must never
// compete with surrounding chrome (Design System §26).
export function QuestionCard({ body }: QuestionCardProps) {
  return (
    <Card>
      <AppText variant="body">{body}</AppText>
    </Card>
  );
}
