import type { UserProfile } from '../domain';
import type { AuthService } from '../auth/AuthService';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

export interface LogoutDeps {
  authService: AuthService;
  userProfileRepository: UserProfileRepository;
}

export interface LogoutParams {
  userId: string;
}

export interface LogoutResult {
  userProfile: UserProfile;
}

// Ends a REGISTERED session and leaves the device in a fresh, valid
// ANONYMOUS state — deliberately not just "sign out and stop." Without
// this, the next BootstrapAppUseCase.execute() would find the old
// (registered) local user_profiles row sitting next to a brand new
// anonymous session id and throw UserProfileMismatchError (see that
// use case's own doc-comment). This use case's job is to make that next
// bootstrap state valid — same guard, same invariant — not to bypass it.
export class LogoutUseCase {
  constructor(private readonly deps: LogoutDeps) {}

  async execute(params: LogoutParams): Promise<LogoutResult> {
    await this.deps.authService.signOut();

    // Local-only cleanup: never touches Supabase. Runs after signOut()
    // so a failure here still leaves the server-side session ended.
    await this.deps.userProfileRepository.clearLocalUserData(params.userId);

    // Mirrors BootstrapAppUseCase's own pattern: the new session's
    // userId is the only source of truth for the fresh local row, never
    // fabricated and never reusing the just-cleared id.
    const session = await this.deps.authService.getOrCreateAnonymousSession();

    const userProfile = await this.deps.userProfileRepository.create({
      id: session.userId,
      accountStatus: 'ANONYMOUS',
    });

    return { userProfile };
  }
}
