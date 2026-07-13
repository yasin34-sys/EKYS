import type { AccountStatus, NewUserProfile, UserProfile } from '../domain';

export interface UserProfileRepository {
  getCurrent(): Promise<UserProfile | null>;
  create(profile: NewUserProfile): Promise<UserProfile>;
  updateAccountStatus(status: AccountStatus): Promise<void>;

  // Deletes every local row scoped to this user (attempts, learning
  // metrics, trial access, entitlements/package_access, exam sessions,
  // and finally the user_profiles row itself), in FK-safe order. Never
  // touches global/content-cache tables (exams/topics/packages/
  // questions/question_options/package_questions/content_sync_state) —
  // those are shared, not user-owned. Used by LogoutUseCase; not part of
  // any other flow.
  clearLocalUserData(userId: string): Promise<void>;
}
