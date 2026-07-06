import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttemptRepository } from '../repositories/AttemptRepository';
import type { ExamSessionRepository } from '../repositories/ExamSessionRepository';
import type { LearningMetricsRepository } from '../repositories/LearningMetricsRepository';
import type { PushSync } from './PushSync';
import type { SyncResult, TableSyncResult } from './types';
import { SyncNotConfiguredError, SyncRowError } from './errors';

// Rows are pushed one at a time, not as a single batch upsert. A batch
// upsert would run as one transaction — if any single row violated a
// constraint, PostgREST would roll back the entire batch and block
// every other valid row from syncing. Row-by-row trades some
// throughput for real retry-safety: one bad row never blocks the rest,
// and only rows with a confirmed successful response are marked
// synced — everything else naturally retries on the next push() call.
export class SupabasePushSync implements PushSync {
  constructor(
    private readonly client: SupabaseClient | null,
    private readonly attemptRepository: AttemptRepository,
    private readonly examSessionRepository: ExamSessionRepository,
    private readonly learningMetricsRepository: LearningMetricsRepository,
  ) {}

  async push(): Promise<SyncResult> {
    const startedAt = new Date().toISOString();

    if (!this.client) {
      throw new SyncNotConfiguredError();
    }
    const client = this.client;

    const tables = [
      await this.pushAttempts(client),
      await this.pushExamSessions(client),
      await this.pushLearningMetrics(client),
    ];

    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      tables,
      ok: tables.every((t) => t.failed === 0),
    };
  }

  private async pushAttempts(client: SupabaseClient): Promise<TableSyncResult> {
    const unsynced = await this.attemptRepository.getUnsynced();
    const succeededIds: string[] = [];
    const errors: SyncRowError[] = [];

    for (const attempt of unsynced) {
      // Only client-writable columns — server_verified_correct/
      // server_verified_at are server-only and never pushed.
      const { error } = await client.from('attempts').upsert({
        id: attempt.id,
        user_id: attempt.userId,
        exam_id: attempt.examId,
        question_id: attempt.questionId,
        exam_session_id: attempt.examSessionId,
        sequence: attempt.sequence,
        selected_option_id: attempt.selectedOptionId,
        is_correct: attempt.isCorrect,
        answered_at: attempt.answeredAt,
      });

      if (error) {
        errors.push(new SyncRowError('attempts', attempt.id, error));
      } else {
        succeededIds.push(attempt.id);
      }
    }

    if (succeededIds.length > 0) {
      await this.attemptRepository.markSynced(succeededIds);
    }

    return { table: 'attempts', succeeded: succeededIds.length, failed: errors.length, errors };
  }

  private async pushExamSessions(client: SupabaseClient): Promise<TableSyncResult> {
    const unsynced = await this.examSessionRepository.getUnsynced();
    const succeededIds: string[] = [];
    const errors: SyncRowError[] = [];

    for (const session of unsynced) {
      // upsert by id covers both the creation sync and the later
      // completion/update sync in one operation.
      const { error } = await client.from('exam_sessions').upsert({
        id: session.id,
        user_id: session.userId,
        exam_id: session.examId,
        package_id: session.packageId,
        status: session.status,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        score: session.score,
        passed: session.passed,
      });

      if (error) {
        errors.push(new SyncRowError('exam_sessions', session.id, error));
      } else {
        succeededIds.push(session.id);
      }
    }

    if (succeededIds.length > 0) {
      await this.examSessionRepository.markSynced(succeededIds);
    }

    return {
      table: 'exam_sessions',
      succeeded: succeededIds.length,
      failed: errors.length,
      errors,
    };
  }

  private async pushLearningMetrics(client: SupabaseClient): Promise<TableSyncResult> {
    const unsynced = await this.learningMetricsRepository.getUnsynced();
    const succeededIds: string[] = [];
    const errors: SyncRowError[] = [];

    for (const metric of unsynced) {
      const { error } = await client.from('learning_metrics').upsert({
        id: metric.id,
        user_id: metric.userId,
        exam_id: metric.examId,
        topic_id: metric.topicId,
        metric_type: metric.metricType,
        value: metric.value,
        computed_from: metric.computedFrom,
        computed_to: metric.computedTo,
        computed_at: metric.computedAt,
      });

      if (error) {
        errors.push(new SyncRowError('learning_metrics', metric.id, error));
      } else {
        succeededIds.push(metric.id);
      }
    }

    if (succeededIds.length > 0) {
      await this.learningMetricsRepository.markSynced(succeededIds);
    }

    return {
      table: 'learning_metrics',
      succeeded: succeededIds.length,
      failed: errors.length,
      errors,
    };
  }
}
