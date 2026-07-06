import type { UserProfile } from '../domain';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';
import type { AuthService } from '../auth/AuthService';

export interface BootstrapAppResult {
  userProfile: UserProfile;
}

export interface BootstrapAppDeps {
  authService: AuthService;
  userProfileRepository: UserProfileRepository;
}

// Thrown when a local UserProfile exists but its id doesn't match the
// current auth session's user id (e.g. local data survived a sign-out
// / new-anonymous-session cycle). Reconciling this is out of scope for
// this pass — surfaced explicitly rather than silently overwritten or
// silently ignored.
export class UserProfileMismatchError extends Error {
  constructor(
    public readonly localUserId: string,
    public readonly sessionUserId: string,
  ) {
    super(
      `Local UserProfile id (${localUserId}) does not match the current auth session's user id (${sessionUserId}).`,
    );
    this.name = 'UserProfileMismatchError';
  }
}

export class BootstrapAppUseCase {
  constructor(private readonly deps: BootstrapAppDeps) {}

  async execute(): Promise<BootstrapAppResult> {
    // getOrCreateAnonymousSession() is the only source of a real user
    // id here — never fabricated locally.
    const session = await this.deps.authService.getOrCreateAnonymousSession();

    const existing = await this.deps.userProfileRepository.getCurrent();

    if (existing && existing.id !== session.userId) {
      throw new UserProfileMismatchError(existing.id, session.userId);
    }

    const userProfile =
      existing ??
      (await this.deps.userProfileRepository.create({
        id: session.userId,
        accountStatus: 'ANONYMOUS',
      }));

    return { userProfile };
  }
}
