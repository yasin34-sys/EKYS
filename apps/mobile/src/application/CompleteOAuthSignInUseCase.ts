import type { AccountStatus, UserProfile } from '../domain';
import type { AuthService } from '../auth/AuthService';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

export interface CompleteOAuthSignInDeps {
  authService: AuthService;
  userProfileRepository: UserProfileRepository;
}

export interface CompleteOAuthSignInParams {
  accessToken: string;
  refreshToken: string;
}

export interface CompleteOAuthSignInResult {
  userProfile: UserProfile;
}

// Finishes the ekyscepte://auth-callback redirect (see
// app/auth-callback.tsx) — same identity-switch shape as
// SignInWithPasswordUseCase and for the same reason: an OAuth sign-in
// may resolve to a different person than whatever local user this
// device was last showing, so local data for the previous local user
// must never mix with the new one's.
export class CompleteOAuthSignInUseCase {
  constructor(private readonly deps: CompleteOAuthSignInDeps) {}

  async execute(params: CompleteOAuthSignInParams): Promise<CompleteOAuthSignInResult> {
    const currentLocalUser = await this.deps.userProfileRepository.getCurrent();

    const session = await this.deps.authService.completeOAuthSession({
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
    });

    // Same reasoning as SignInWithPasswordUseCase: an OAuth user may not
    // have a server-side user_profiles row yet either.
    await this.deps.authService.ensureServerRegisteredUserProfile();

    const accountStatus: AccountStatus = session.isAnonymous ? 'ANONYMOUS' : 'REGISTERED';

    if (currentLocalUser && currentLocalUser.id === session.userId) {
      if (currentLocalUser.accountStatus !== accountStatus) {
        await this.deps.userProfileRepository.updateAccountStatus(accountStatus);
      }
      const refreshed = await this.deps.userProfileRepository.getCurrent();
      return { userProfile: refreshed ?? currentLocalUser };
    }

    if (currentLocalUser) {
      await this.deps.userProfileRepository.clearLocalUserData(currentLocalUser.id);
    }

    const userProfile = await this.deps.userProfileRepository.create({
      id: session.userId,
      accountStatus,
    });

    return { userProfile };
  }
}
