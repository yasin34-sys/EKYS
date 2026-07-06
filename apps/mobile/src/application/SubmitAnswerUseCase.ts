import type { Attempt } from '../domain';
import type { AttemptRepository } from '../repositories/AttemptRepository';
import type { QuestionRepository } from '../repositories/QuestionRepository';
import type { LearningMetricsRepository } from '../repositories/LearningMetricsRepository';
import { NotFoundError } from '../repositories/errors';
import { computeTopicAccuracy } from '../rule-engine/computeTopicAccuracy';
import type { IdGenerator } from './shared/IdGenerator';
import type { Clock } from './shared/Clock';

export interface SubmitAnswerDeps {
  attemptRepository: AttemptRepository;
  questionRepository: QuestionRepository;
  learningMetricsRepository: LearningMetricsRepository;
  generateId: IdGenerator;
  now: Clock;
}

export interface SubmitAnswerParams {
  userId: string;
  examId: string;
  questionId: string;
  examSessionId: string | null;
  sequence: number | null;
  selectedOptionId: string;
}

export interface SubmitAnswerResult {
  attempt: Attempt;
  isCorrect: boolean;
}

// Orchestrates: create Attempt -> pure Rule Engine recompute -> upsert
// LearningMetric. The Rule Engine itself never touches a Repository —
// all fetching and persistence happens here.
export class SubmitAnswerUseCase {
  constructor(private readonly deps: SubmitAnswerDeps) {}

  async execute(params: SubmitAnswerParams): Promise<SubmitAnswerResult> {
    const question = await this.deps.questionRepository.getById(params.questionId);
    if (!question) {
      throw new NotFoundError('Question', params.questionId);
    }

    const selectedOption = question.options.find(
      (option) => option.id === params.selectedOptionId,
    );
    if (!selectedOption) {
      throw new NotFoundError('QuestionOption', params.selectedOptionId);
    }

    // is_correct is client-computed, per the approved physical schema —
    // server_verified_correct is a separate, server-only field.
    const isCorrect = selectedOption.isCorrect;

    const attempt = await this.deps.attemptRepository.create({
      id: this.deps.generateId(),
      userId: params.userId,
      examId: params.examId,
      questionId: params.questionId,
      examSessionId: params.examSessionId,
      sequence: params.sequence,
      selectedOptionId: params.selectedOptionId,
      isCorrect,
      answeredAt: this.deps.now(),
    });

    const topicAttempts = await this.deps.attemptRepository.getByTopic(
      params.userId,
      params.examId,
      question.topicId,
    );

    const accuracy = computeTopicAccuracy({
      topicId: question.topicId,
      attempts: topicAttempts.map((a) => ({ isCorrect: a.isCorrect })),
    });

    await this.deps.learningMetricsRepository.upsert({
      id: this.deps.generateId(),
      userId: params.userId,
      examId: params.examId,
      topicId: accuracy.topicId,
      metricType: accuracy.metricType,
      value: accuracy.value,
      computedFrom: null,
      computedTo: null,
    });

    return { attempt, isCorrect };
  }
}
