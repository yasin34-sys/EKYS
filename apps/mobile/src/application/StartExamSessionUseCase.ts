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

// The requested package failed one of the checks a formal Deneme
// session requires (wrong exam, not published, or not actually a
// ZORLAYICI_DENEME package) — distinct from EntitlementDeniedError,
// which only ever means "this package is valid but you can't access
// it."
export class InvalidExamSessionPackageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidExamSessionPackageError';
  }
}

// The caller already has an IN_PROGRESS session for this exam, but it
// was started against a different package than the one just requested
// and validated. Silently handing back that mismatched session would
// let a caller believe it started a session for packageId A while the
// session actually being resumed is for package B — this rejects
// instead so the caller (exam-start) can surface it rather than
// building on top of a wrong assumption.
export class ActiveSessionPackageMismatchError extends Error {
  constructor(
    public readonly activeSessionId: string,
    public readonly activePackageId: string,
    public readonly requestedPackageId: string,
  ) {
    super(
      `Active exam session ${activeSessionId} is for package ${activePackageId}, not requested package ${requestedPackageId}`,
    );
    this.name = 'ActiveSessionPackageMismatchError';
  }
}

export class StartExamSessionUseCase {
  constructor(private readonly deps: StartExamSessionDeps) {}

  async execute(params: StartExamSessionParams): Promise<ExamSession> {
    const pkg = await this.deps.packageRepository.getById(params.packageId);
    if (!pkg) {
      throw new NotFoundError('Package', params.packageId);
    }

    if (pkg.examId !== params.examId) {
      throw new InvalidExamSessionPackageError(
        `Package ${params.packageId} belongs to exam ${pkg.examId}, not requested exam ${params.examId}`,
      );
    }
    if (pkg.status !== 'PUBLISHED') {
      throw new InvalidExamSessionPackageError(
        `Package ${params.packageId} is not published (status: ${pkg.status})`,
      );
    }
    if (pkg.packageType !== 'ZORLAYICI_DENEME') {
      throw new InvalidExamSessionPackageError(
        `Package ${params.packageId} is not a Deneme package (type: ${pkg.packageType})`,
      );
    }

    // Same two-path access rule as GetPackagesByExamUseCase/
    // GetAllPackagesUseCase — free-tier packages never require an
    // Entitlement row. Only runs once the requested package itself is
    // known to be valid, so an EntitlementDeniedError always implies a
    // legitimate package that the user simply can't access yet.
    const hasAccess =
      pkg.isFreeTier ||
      (await this.deps.entitlementRepository.hasAccess(params.userId, params.packageId));
    if (!hasAccess) {
      throw new EntitlementDeniedError(params.userId, params.packageId);
    }

    // Idempotent: reuse an already-active session for this exam rather
    // than starting a second concurrent one — but only if it's for the
    // exact package just validated above. An active session for a
    // different package within the same exam is a real conflict, not
    // something to paper over by silently handing back a mismatched
    // session (see ActiveSessionPackageMismatchError).
    const existing = await this.deps.examSessionRepository.getActive(
      params.userId,
      params.examId,
    );
    if (existing) {
      if (existing.packageId === params.packageId) {
        return existing;
      }
      throw new ActiveSessionPackageMismatchError(existing.id, existing.packageId, params.packageId);
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
