// DEV/QA HARNESS ONLY (see seedData.ts header). Real auth is
// SupabaseAuthService — this exists solely because no Supabase project is
// configured in this environment and BootstrapAppUseCase needs a session
// immediately to unblock web-preview visual QA.
import type { AuthService, AuthSession, UpgradeAnonymousAccountParams } from '../../auth/AuthService';
import { SEED_USER_ID } from './seedData';

export class InMemoryAuthService implements AuthService {
  async getOrCreateAnonymousSession(): Promise<AuthSession> {
    return { userId: SEED_USER_ID, isAnonymous: true };
  }
  async getCurrentUserId(): Promise<string | null> {
    return SEED_USER_ID;
  }
  async upgradeAnonymousAccount(_params: UpgradeAnonymousAccountParams): Promise<AuthSession> {
    return { userId: SEED_USER_ID, isAnonymous: false };
  }
  // No-op: the web-preview harness has no real Supabase project to
  // provision a server-side row against.
  async ensureServerUserProfile(): Promise<void> {}
}
