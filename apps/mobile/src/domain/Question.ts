export type QuestionType = 'SINGLE_CHOICE';
export type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionOptionLabel = 'A' | 'B' | 'C' | 'D' | 'E';

// QuestionOption has no independent meaning outside its Question, so it
// is folded into the Question domain object rather than exposed as its
// own repository, per the Repository Pattern Blueprint.
export interface QuestionOption {
  id: string;
  questionId: string;
  label: QuestionOptionLabel;
  body: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface Question {
  id: string;
  examId: string;
  topicId: string;
  questionType: QuestionType;
  body: string;
  revision: number;
  status: QuestionStatus;
  options: QuestionOption[];
  createdAt: string;
  updatedAt: string;
}
