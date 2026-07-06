// Injected rather than reading the wall clock directly, per the
// Testing Strategy's Deterministic Test Principle — tests supply a
// fixed Clock instead of depending on real time.
export type Clock = () => string; // ISO-8601 timestamp
