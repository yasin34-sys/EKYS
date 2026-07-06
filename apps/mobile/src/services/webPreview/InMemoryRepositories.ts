// ============================================================================
// In-Memory Repositories — DEV/QA HARNESS ONLY (see seedData.ts header)
// ============================================================================
// Each class below implements the exact same Repository interface the real
// SqliteXRepository classes implement — same contracts, same errors, same
// derived-data rules (Repeat Pool, Learning Metrics upsert-by-key). Nothing
// in application/ or app/ can tell the difference. Only reached when
// Platform.OS === 'web' (see createWebPreviewServices.ts).
// ============================================================================

import type {
  Exam,
  Topic,
  Question,
  Package,
  UserProfile,
  NewUserProfile,
  AccountStatus,
  Entitlement,
  Attempt,
  NewAttempt,
  ExamSession,
  NewExamSession,
  LearningMetric,
  NewLearningMetric,
  RepeatPoolEntry,
} from '../../domain';
import type { ExamRepository } from '../../repositories/ExamRepository';
import type { TopicRepository } from '../../repositories/TopicRepository';
import type { QuestionRepository } from '../../repositories/QuestionRepository';
import type { PackageRepository } from '../../repositories/PackageRepository';
import type { UserProfileRepository } from '../../repositories/UserProfileRepository';
import type { EntitlementRepository } from '../../repositories/EntitlementRepository';
import type { AttemptRepository } from '../../repositories/AttemptRepository';
import type { ExamSessionRepository } from '../../repositories/ExamSessionRepository';
import type { LearningMetricsRepository } from '../../repositories/LearningMetricsRepository';
import type { RepeatPoolRepository } from '../../repositories/RepeatPoolRepository';
import type { TrialAccessRepository } from '../../repositories/TrialAccessRepository';
import { NotFoundError } from '../../repositories/errors';
import {
  seedExam,
  seedTopics,
  seedQuestions,
  seedPackages,
  seedPackageQuestions,
  seedUserProfile,
  seedEntitlements,
  seedAttempts,
  seedLearningMetrics,
} from './seedData';

// Single shared mutable store, module-scoped — persists for the life of the
// web preview session (i.e. until the page reloads), same lifetime as
// SQLite's file-backed persistence on native.
class WebPreviewStore {
  exams: Exam[] = [seedExam];
  topics: Topic[] = [...seedTopics];
  questions: Question[] = [...seedQuestions];
  packages: Package[] = [...seedPackages];
  packageQuestions: Record<string, string[]> = { ...seedPackageQuestions };
  userProfile: UserProfile | null = { ...seedUserProfile };
  entitlements: Entitlement[] = seedEntitlements.map((e) => ({ ...e }));
  attempts: Attempt[] = seedAttempts.map((a) => ({ ...a }));
  examSessions: ExamSession[] = [];
  learningMetrics: LearningMetric[] = seedLearningMetrics.map((m) => ({ ...m }));
}

export const webPreviewStore = new WebPreviewStore();

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryExamRepository implements ExamRepository {
  async getPublished(): Promise<Exam[]> {
    return webPreviewStore.exams.filter((e) => e.status === 'PUBLISHED');
  }
  async getById(id: string): Promise<Exam | null> {
    return webPreviewStore.exams.find((e) => e.id === id) ?? null;
  }
}

export class InMemoryTopicRepository implements TopicRepository {
  async getByExam(examId: string): Promise<Topic[]> {
    return webPreviewStore.topics
      .filter((t) => t.examId === examId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }
}

export class InMemoryQuestionRepository implements QuestionRepository {
  async getByPackage(packageId: string): Promise<Question[]> {
    const ids = webPreviewStore.packageQuestions[packageId] ?? [];
    return ids
      .map((id) => webPreviewStore.questions.find((q) => q.id === id))
      .filter((q): q is Question => q !== undefined);
  }
  async getById(id: string): Promise<Question | null> {
    return webPreviewStore.questions.find((q) => q.id === id) ?? null;
  }
}

export class InMemoryPackageRepository implements PackageRepository {
  async getByExam(examId: string): Promise<Package[]> {
    return webPreviewStore.packages.filter((p) => p.examId === examId);
  }
  async getById(id: string): Promise<Package | null> {
    return webPreviewStore.packages.find((p) => p.id === id) ?? null;
  }
  async getAll(): Promise<Package[]> {
    return webPreviewStore.packages.filter((p) => p.status === 'PUBLISHED');
  }
}

export class InMemoryUserProfileRepository implements UserProfileRepository {
  async getCurrent(): Promise<UserProfile | null> {
    return webPreviewStore.userProfile;
  }
  async create(profile: NewUserProfile): Promise<UserProfile> {
    const created: UserProfile = { ...profile, createdAt: nowIso(), updatedAt: nowIso() };
    webPreviewStore.userProfile = created;
    return created;
  }
  async updateAccountStatus(status: AccountStatus): Promise<void> {
    if (!webPreviewStore.userProfile) return;
    webPreviewStore.userProfile = {
      ...webPreviewStore.userProfile,
      accountStatus: status,
      updatedAt: nowIso(),
    };
  }
}

export class InMemoryEntitlementRepository implements EntitlementRepository {
  async getForUser(userId: string): Promise<Entitlement[]> {
    return webPreviewStore.entitlements.filter((e) => e.userId === userId);
  }
  async hasAccess(userId: string, packageId: string): Promise<boolean> {
    return webPreviewStore.entitlements.some(
      (e) => e.userId === userId && e.status === 'ACTIVE' && e.packageIds.includes(packageId),
    );
  }
}

export class InMemoryAttemptRepository implements AttemptRepository {
  async create(attempt: NewAttempt): Promise<Attempt> {
    const created: Attempt = {
      ...attempt,
      serverVerifiedCorrect: null,
      serverVerifiedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      syncedAt: null,
    };
    webPreviewStore.attempts.push(created);
    return created;
  }
  async getByQuestion(userId: string, examId: string, questionId: string): Promise<Attempt[]> {
    return webPreviewStore.attempts.filter(
      (a) => a.userId === userId && a.examId === examId && a.questionId === questionId,
    );
  }
  async getByTopic(userId: string, examId: string, topicId: string): Promise<Attempt[]> {
    const topicQuestionIds = new Set(
      webPreviewStore.questions.filter((q) => q.topicId === topicId).map((q) => q.id),
    );
    return webPreviewStore.attempts.filter(
      (a) => a.userId === userId && a.examId === examId && topicQuestionIds.has(a.questionId),
    );
  }
  async getBySession(examSessionId: string): Promise<Attempt[]> {
    return webPreviewStore.attempts
      .filter((a) => a.examSessionId === examSessionId)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }
  async getUnsynced(): Promise<Attempt[]> {
    return webPreviewStore.attempts.filter((a) => a.syncedAt === null);
  }
  async markSynced(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    webPreviewStore.attempts = webPreviewStore.attempts.map((a) =>
      idSet.has(a.id) ? { ...a, syncedAt: nowIso() } : a,
    );
  }
}

export class InMemoryExamSessionRepository implements ExamSessionRepository {
  async create(session: NewExamSession): Promise<ExamSession> {
    const created: ExamSession = {
      ...session,
      status: 'IN_PROGRESS',
      completedAt: null,
      score: null,
      passed: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      syncedAt: null,
    };
    webPreviewStore.examSessions.push(created);
    return created;
  }
  async update(session: ExamSession): Promise<ExamSession> {
    const index = webPreviewStore.examSessions.findIndex((s) => s.id === session.id);
    if (index === -1) throw new NotFoundError('ExamSession', session.id);
    const updated: ExamSession = { ...session, updatedAt: nowIso() };
    webPreviewStore.examSessions[index] = updated;
    return updated;
  }
  async getActive(userId: string, examId: string): Promise<ExamSession | null> {
    return (
      webPreviewStore.examSessions.find(
        (s) => s.userId === userId && s.examId === examId && s.status === 'IN_PROGRESS',
      ) ?? null
    );
  }
  async getUnsynced(): Promise<ExamSession[]> {
    return webPreviewStore.examSessions.filter((s) => s.syncedAt === null);
  }
  async markSynced(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    webPreviewStore.examSessions = webPreviewStore.examSessions.map((s) =>
      idSet.has(s.id) ? { ...s, syncedAt: nowIso() } : s,
    );
  }
}

export class InMemoryLearningMetricsRepository implements LearningMetricsRepository {
  async upsert(metric: NewLearningMetric): Promise<LearningMetric> {
    const index = webPreviewStore.learningMetrics.findIndex(
      (m) =>
        m.userId === metric.userId &&
        m.examId === metric.examId &&
        m.topicId === metric.topicId &&
        m.metricType === metric.metricType,
    );

    if (index !== -1) {
      const updated: LearningMetric = {
        ...webPreviewStore.learningMetrics[index],
        value: metric.value,
        computedFrom: metric.computedFrom,
        computedTo: metric.computedTo,
        computedAt: nowIso(),
        updatedAt: nowIso(),
      };
      webPreviewStore.learningMetrics[index] = updated;
      return updated;
    }

    const created: LearningMetric = {
      ...metric,
      computedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      syncedAt: null,
    };
    webPreviewStore.learningMetrics.push(created);
    return created;
  }
  async getForUser(userId: string, examId: string, topicId?: string): Promise<LearningMetric[]> {
    return webPreviewStore.learningMetrics.filter(
      (m) =>
        m.userId === userId &&
        m.examId === examId &&
        (topicId === undefined || m.topicId === topicId),
    );
  }
  async getUnsynced(): Promise<LearningMetric[]> {
    return webPreviewStore.learningMetrics.filter((m) => m.syncedAt === null);
  }
  async markSynced(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    webPreviewStore.learningMetrics = webPreviewStore.learningMetrics.map((m) =>
      idSet.has(m.id) ? { ...m, syncedAt: nowIso() } : m,
    );
  }
}

// Mirrors the repeat_pool SQL view exactly (see docs/database/sqlite_schema.sql):
// latest Attempt per (user, exam, question) by answered_at (ties broken by
// created_at then id, descending), kept only when that latest attempt is
// incorrect. Abandoned-session attempts still count — no session-status
// filtering here, matching the view.
export class InMemoryRepeatPoolRepository implements RepeatPoolRepository {
  async getForUser(userId: string, examId: string): Promise<RepeatPoolEntry[]> {
    const scoped = webPreviewStore.attempts.filter(
      (a) => a.userId === userId && a.examId === examId,
    );

    const latestByQuestion = new Map<string, Attempt>();
    for (const attempt of scoped) {
      const existing = latestByQuestion.get(attempt.questionId);
      if (!existing) {
        latestByQuestion.set(attempt.questionId, attempt);
        continue;
      }
      const isNewer =
        attempt.answeredAt > existing.answeredAt ||
        (attempt.answeredAt === existing.answeredAt &&
          (attempt.createdAt > existing.createdAt ||
            (attempt.createdAt === existing.createdAt && attempt.id > existing.id)));
      if (isNewer) latestByQuestion.set(attempt.questionId, attempt);
    }

    return Array.from(latestByQuestion.values())
      .filter((a) => !a.isCorrect)
      .map((a) => ({
        userId: a.userId,
        examId: a.examId,
        questionId: a.questionId,
        attemptId: a.id,
      }));
  }
}

// No-op: the web-preview harness (Phase 2A/2B scope: Home/Statistics/
// Profile tabs) has no scenario yet that exercises the free-trial
// mechanism, so this always reports "no grants" rather than seeding a
// fake ledger nobody reads.
export class InMemoryTrialAccessRepository implements TrialAccessRepository {
  async hasGrant(_userId: string, _questionId: string): Promise<boolean> {
    return false;
  }
  async getGrantedCount(_userId: string): Promise<number> {
    return 0;
  }
  async hasAnyGrantForPackage(_userId: string, _packageId: string): Promise<boolean> {
    return false;
  }
}
