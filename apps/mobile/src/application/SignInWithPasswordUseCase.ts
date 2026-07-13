import type { AccountStatus, UserProfile } from '../domain';
import type { AuthService } from '../auth/AuthService';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

export interface SignInWithPasswordDeps {
  authService: AuthService;
  userProfileRepository: UserProfileRepository;
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export interface SignInWithPasswordResult {
  userProfile: UserProfile;
}

// Switches the device's local identity to whichever Supabase user
// email+password resolves to — which may be a different person than
// whatever anonymous/registered user this device was last showing.
//
// Ordering, and why it differs from "clear local data, then sign in":
// signInWithPassword() itself is non-destructive on failure — a wrong
// password never changes the Supabase client's active session and never
// touches local SQLite. Clearing the current local user's data *before*
// attempting sign-in would mean a simple typo destroys that user's real
// local progress (attempts/learning_metrics/etc.) even though they never
// actually left their own account. Attempting sign-in first, and only
// clearing/switching local data once Supabase has confirmed a session
// for the (possibly different) target user, avoids that needless data
// loss while still fully preventing user A/B mixing: the previous
// local user's rows are always gone before the new user's local profile
// row is created.
//
// If clearLocalUserData or the new profile create/update throws after
// signInWithPassword already succeeded, the device is left with local
// data for the old user but a Supabase session for the new one. The
// next BootstrapAppUseCase.execute() will detect that id mismatch and
// throw UserProfileMismatchError rather than silently mixing the two
// users' data — the existing guard from Phase 8B.0, kept intact here,
// not bypassed.
export class SignInWithPasswordUseCase {
  constructor(private readonly deps: SignInWithPasswordDeps) {}

  async execute(params: SignInWithPasswordParams): Promise<SignInWithPasswordResult> {
    const currentLocalUser = await this.deps.userProfileRepository.getCurrent();

    const session = await this.deps.authService.signInWithPassword({
      email: params.email.trim(),
      password: params.password,
    });

    // Must happen before any local profile switch/create below: a
    // password-authenticated user may be a Dashboard-created account with
    // no server-side user_profiles row yet (see ensureServerRegisteredUserProfile
    // doc), and push sync for this user would otherwise fail with an FK
    // violation on attempts/exam_sessions/learning_metrics.
    await this.deps.authService.ensureServerRegisteredUserProfile();

    const accountStatus: AccountStatus = session.isAnonymous ? 'ANONYMOUS' : 'REGISTERED';

    // Same identity re-authenticating (e.g. after a dropped/expired
    // session): never wipe this user's own local rows just because they
    // signed in again. Only a genuine identity switch clears local data.
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
