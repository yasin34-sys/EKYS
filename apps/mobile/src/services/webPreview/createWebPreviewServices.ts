// DEV/QA HARNESS ONLY (see seedData.ts header). Assembles a Services object
// identical in shape to createServices.ts's real one, backed entirely by
// in-memory repositories + a stub AuthService/SyncService. Only called from
// app/_layout.tsx when Platform.OS === 'web'.
import type { Services } from '../types';
import { InMemoryAuthService } from './InMemoryAuthService';
import {
  InMemoryExamRepository,
  InMemoryTopicRepository,
  InMemoryQuestionRepository,
  InMemoryPackageRepository,
  InMemoryUserProfileRepository,
  InMemoryEntitlementRepository,
  InMemoryAttemptRepository,
  InMemoryExamSessionRepository,
  InMemoryLearningMetricsRepository,
  InMemoryRepeatPoolRepository,
  InMemoryTrialAccessRepository,
} from './InMemoryRepositories';
import type { SyncService } from '../../sync/SyncService';
import type {
  SyncResult,
  TrialCandidateQuestion,
  TrialGrantHydrationResult,
  TrialGrantParams,
  TrialGrantSyncPort,
} from '../../sync/types';

function emptySyncResult(): SyncResult {
  const timestamp = new Date().toISOString();
  return { startedAt: timestamp, finishedAt: timestamp, tables: [], ok: true };
}

class NoopSyncService implements SyncService {
  async push(): Promise<SyncResult> {
    return emptySyncResult();
  }
  async pull(): Promise<SyncResult> {
    return emptySyncResult();
  }
}

// Never grants real access: getCandidates always reports nothing to
// request, and requestAndHydrate always reports OFFLINE rather than
// fabricating a GRANTED result, since the web-preview harness has no
// real Supabase project to grant against.
class NoopTrialGrantSync implements TrialGrantSyncPort {
  async getCandidates(_packageId: string): Promise<TrialCandidateQuestion[]> {
    return [];
  }
  async requestAndHydrate(_params: TrialGrantParams): Promise<TrialGrantHydrationResult> {
    return { status: 'OFFLINE' };
  }
}

export function createWebPreviewServices(): Services {
  return {
    authService: new InMemoryAuthService(),
    syncService: new NoopSyncService(),
    trialGrantSync: new NoopTrialGrantSync(),
    examRepository: new InMemoryExamRepository(),
    topicRepository: new InMemoryTopicRepository(),
    questionRepository: new InMemoryQuestionRepository(),
    packageRepository: new InMemoryPackageRepository(),
    userProfileRepository: new InMemoryUserProfileRepository(),
    entitlementRepository: new InMemoryEntitlementRepository(),
    attemptRepository: new InMemoryAttemptRepository(),
    examSessionRepository: new InMemoryExamSessionRepository(),
    learningMetricsRepository: new InMemoryLearningMetricsRepository(),
    repeatPoolRepository: new InMemoryRepeatPoolRepository(),
    trialAccessRepository: new InMemoryTrialAccessRepository(),
  };
}
