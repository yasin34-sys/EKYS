export abstract class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Thrown instead of letting supabase-js throw an opaque runtime error
// when the client was never constructed (no real credentials yet).
export class AuthNotConfiguredError extends AuthError {
  constructor() {
    super(
      'Supabase auth is not configured: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing.',
    );
  }
}

export class AuthSessionError extends AuthError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
