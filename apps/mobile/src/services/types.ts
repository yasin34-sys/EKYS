import type { ExamRepository } from '../repositories/ExamRepository';
import type { TopicRepository } from '../repositories/TopicRepository';
import type { QuestionRepository } from '../repositories/QuestionRepository';
import type { PackageRepository } from '../repositories/PackageRepository';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import type { AttemptRepository } from '../repositories/AttemptRepository';
import type { ExamSessionRepository } from '../repositories/ExamSessionRepository';
import type { LearningMetricsRepository } from '../repositories/LearningMetricsRepository';
import type { RepeatPoolRepository } from '../repositories/RepeatPoolRepository';
import type { TrialAccessRepository } from '../repositories/TrialAccessRepository';
import type { AuthService } from '../auth/AuthService';
import type { SyncService } from '../sync/SyncService';
import type { TrialGrantSyncPort } from '../sync/types';

export interface Services {
  authService: AuthService;
  syncService: SyncService;
  trialGrantSync: TrialGrantSyncPort;
  examRepository: ExamRepository;
  topicRepository: TopicRepository;
  questionRepository: QuestionRepository;
  packageRepository: PackageRepository;
  userProfileRepository: UserProfileRepository;
  entitlementRepository: EntitlementRepository;
  attemptRepository: AttemptRepository;
  examSessionRepository: ExamSessionRepository;
  learningMetricsRepository: LearningMetricsRepository;
  repeatPoolRepository: RepeatPoolRepository;
  trialAccessRepository: TrialAccessRepository;
}
