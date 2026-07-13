import type { DB } from '@op-engineering/op-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Services } from './types';
import { SupabaseAuthService } from '../auth/SupabaseAuthService';
import { SqliteExamRepository } from '../repositories/sqlite/SqliteExamRepository';
import { SqliteTopicRepository } from '../repositories/sqlite/SqliteTopicRepository';
import { SqliteQuestionRepository } from '../repositories/sqlite/SqliteQuestionRepository';
import { SqlitePackageRepository } from '../repositories/sqlite/SqlitePackageRepository';
import { SqliteUserProfileRepository } from '../repositories/sqlite/SqliteUserProfileRepository';
import { SqliteEntitlementRepository } from '../repositories/sqlite/SqliteEntitlementRepository';
import { SqliteAttemptRepository } from '../repositories/sqlite/SqliteAttemptRepository';
import { SqliteExamSessionRepository } from '../repositories/sqlite/SqliteExamSessionRepository';
import { SqliteLearningMetricsRepository } from '../repositories/sqlite/SqliteLearningMetricsRepository';
import { SqliteRepeatPoolRepository } from '../repositories/sqlite/SqliteRepeatPoolRepository';
import { SqliteTrialAccessRepository } from '../repositories/sqlite/SqliteTrialAccessRepository';
import { SupabasePushSync } from '../sync/SupabasePushSync';
import { SupabasePullSync } from '../sync/SupabasePullSync';
import { DefaultSyncService } from '../sync/DefaultSyncService';
import { TrialGrantSync } from '../sync/TrialGrantSync';
import { NotConfiguredPurchaseService } from '../billing/NotConfiguredPurchaseService';

export function createServices(db: DB, supabase: SupabaseClient | null): Services {
  const authService = new SupabaseAuthService(supabase);

  const attemptRepository = new SqliteAttemptRepository(db);
  const examSessionRepository = new SqliteExamSessionRepository(db);
  const learningMetricsRepository = new SqliteLearningMetricsRepository(db);

  const pushSync = new SupabasePushSync(
    supabase,
    attemptRepository,
    examSessionRepository,
    learningMetricsRepository,
  );
  const pullSync = new SupabasePullSync(supabase, db, authService);

  return {
    authService,
    syncService: new DefaultSyncService(pushSync, pullSync),
    trialGrantSync: new TrialGrantSync(supabase, db),
    purchaseService: new NotConfiguredPurchaseService(),
    examRepository: new SqliteExamRepository(db),
    topicRepository: new SqliteTopicRepository(db),
    questionRepository: new SqliteQuestionRepository(db),
    packageRepository: new SqlitePackageRepository(db),
    userProfileRepository: new SqliteUserProfileRepository(db),
    entitlementRepository: new SqliteEntitlementRepository(db),
    attemptRepository,
    examSessionRepository,
    learningMetricsRepository,
    repeatPoolRepository: new SqliteRepeatPoolRepository(db),
    trialAccessRepository: new SqliteTrialAccessRepository(db),
  };
}
