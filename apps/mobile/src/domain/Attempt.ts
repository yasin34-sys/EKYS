export interface Attempt {
  id: string;
  userId: string;
  examId: string;
  questionId: string;
  examSessionId: string | null;
  sequence: number | null;
  selectedOptionId: string;
  isCorrect: boolean;
  serverVerifiedCorrect: boolean | null;
  serverVerifiedAt: string | null;
  answeredAt: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// Fields the client is responsible for supplying when recording a new
// Attempt. id is client-generated and doubles as the idempotency key
// on sync. server_verified_* fields are never client-supplied.
export interface NewAttempt {
  id: string;
  userId: string;
  examId: string;
  questionId: string;
  examSessionId: string | null;
  sequence: number | null;
  selectedOptionId: string;
  isCorrect: boolean;
  answeredAt: string;
}
