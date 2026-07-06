// Injected rather than called directly from each use case, so use
// cases stay deterministic and testable (fake id generators in tests).
export type IdGenerator = () => string;
