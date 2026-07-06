import type { ExamSession } from '../domain';
import type { ExamSessionRepository } from '../repositories/ExamSessionRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import type { PackageRepository } from '../repositories/PackageRepository';
import { EntitlementDeniedError, NotFoundError } from '../repositories/errors';
import type { IdGenerator } from './shared/IdGenerator';
import type { Clock } from './shared/Clock';

export interface StartExamSessionDeps {
  examSessionRepository: ExamSessionRepository;
  entitlementRepository: EntitlementRepository;
  packageRepository: PackageRepository;
  generateId: IdGenerator;
  now: Clock;
}

export interface StartExamSessionParams {
  userId: string;
  examId: string;
  packageId: string;
}

export class StartExamSessionUseCase {
  constructor(private readonly deps: StartExamSessionDeps) {}

  async execute(params: StartExamSessionParams): Promise<ExamSession> {
    // Idempotent: reuse an already-active session for this exam rather
    // than starting a second concurrent one.
    const existing = await this.deps.examSessionRepository.getActive(
      params.userId,
      params.examId,
    );
    if (existing) {
      return existing;
    }

    // Same two-path access rule as GetPackagesByExamUseCase/
    // GetAllPackagesUseCase — free-tier packages never require an
    // Entitlement row. Missing this OR was a real bug: it would have
    // rejected free-tier users the moment this use case was actually
    // wired to a screen.
    const pkg = await this.deps.packageRepository.getById(params.packageId);
    if (!pkg) {
      throw new NotFoundError('Package', params.packageId);
    }
    const hasAccess =
      pkg.isFreeTier ||
      (await this.deps.entitlementRepository.hasAccess(params.userId, params.packageId));
    if (!hasAccess) {
      throw new EntitlementDeniedError(params.userId, params.packageId);
    }

    return this.deps.examSessionRepository.create({
      id: this.deps.generateId(),
      userId: params.userId,
      examId: params.examId,
      packageId: params.packageId,
      startedAt: this.deps.now(),
    });
  }
}
