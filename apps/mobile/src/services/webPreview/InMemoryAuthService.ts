// DEV/QA HARNESS ONLY (see seedData.ts header). Real auth is
// SupabaseAuthService — this exists solely because no Supabase project is
// configured in this environment and BootstrapAppUseCase needs a session
// immediately to unblock web-preview visual QA.
import type {
  AuthService,
  AuthSession,
  RequestEmailRegistrationParams,
  SignInWithPasswordParams,
} from '../../auth/AuthService';
import { SEED_USER_ID } from './seedData';

export class InMemoryAuthService implements AuthService {
  async getOrCreateAnonymousSession(): Promise<AuthSession> {
    return { userId: SEED_USER_ID, isAnonymous: true };
  }
  async getCurrentUserId(): Promise<string | null> {
    return SEED_USER_ID;
  }
  async requestEmailRegistration(_params: RequestEmailRegistrationParams): Promise<AuthSession> {
    return { userId: SEED_USER_ID, isAnonymous: false };
  }
  // No-op: the web-preview harness has no real Supabase project to
  // provision a server-side row against.
  async ensureServerUserProfile(): Promise<void> {}
  // No-op, same reasoning as ensureServerUserProfile: no real Supabase
  // project to provision a server-side row against.
  async ensureServerRegisteredUserProfile(): Promise<void> {}
  // No-op: no real Supabase session to end. LogoutUseCase's local-clear
  // step (InMemoryUserProfileRepository.clearLocalUserData) still runs
  // against the in-memory store.
  async signOut(): Promise<void> {}
  // Harness-only stand-in: no real Supabase project to validate
  // credentials against, so this always "succeeds" as the same seed
  // user, already registered. Not real auth — never wired to production.
  async signInWithPassword(_params: SignInWithPasswordParams): Promise<AuthSession> {
    return { userId: SEED_USER_ID, isAnonymous: false };
  }
}
