-- ============================================================================
-- EKYS CEPTE — Local SQLite Schema (Reference)
-- ============================================================================
-- Architectural intent:
--   - SQLite is a local offline cache, not the system of record. PostgreSQL
--     (via Supabase) remains the sole authoritative source of truth.
--   - This schema intentionally mirrors the PostgreSQL conceptual model
--     (see docs/database/CONCEPTUAL_DATABASE_MODEL.md and
--     PHYSICAL_DATABASE_SCHEMA.md) as closely as SQLite allows.
--   - Security is enforced by the server before synchronization, not by
--     SQLite — this file contains no access-control logic of any kind.
--   - Repository-layer restrictions (e.g., no local write path for
--     entitlements/attempts beyond what is explicitly allowed) complement
--     this schema precisely because SQLite has no Row Level Security to
--     enforce those rules at the database level.
-- ============================================================================

-- ============================================================================
-- Group 1 — Content Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','INTERNAL','BETA','PUBLISHED','ARCHIVED')),
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  passing_score REAL NOT NULL CHECK (passing_score >= 0),
  supersedes_exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);

CREATE TRIGGER IF NOT EXISTS trg_exams_set_updated_at
AFTER UPDATE ON exams
BEGIN
  UPDATE exams SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;


CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  parent_topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_topics_exam_id ON topics(exam_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_topic_id ON topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_exam_display_order ON topics(exam_id, display_order);

CREATE TRIGGER IF NOT EXISTS trg_topics_set_updated_at
AFTER UPDATE ON topics
BEGIN
  UPDATE topics SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_topics_check_parent_same_exam
BEFORE INSERT ON topics
WHEN NEW.parent_topic_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Topic parent must belong to the same exam')
  WHERE (SELECT exam_id FROM topics WHERE id = NEW.parent_topic_id) != NEW.exam_id;
END;


CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
  question_type TEXT NOT NULL DEFAULT 'SINGLE_CHOICE'
    CHECK (question_type IN ('SINGLE_CHOICE')),
  body TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

CREATE TRIGGER IF NOT EXISTS trg_questions_set_updated_at
AFTER UPDATE ON questions
BEGIN
  UPDATE questions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_questions_check_topic_same_exam
BEFORE INSERT ON questions
BEGIN
  SELECT RAISE(ABORT, 'Question topic must belong to the same exam')
  WHERE (SELECT exam_id FROM topics WHERE id = NEW.topic_id) != NEW.exam_id;
END;


CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (label IN ('A','B','C','D','E')),
  body TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0,1)),
  display_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_question_options_one_correct
  ON question_options(question_id) WHERE is_correct = 1;


CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  package_type TEXT NOT NULL
    CHECK (package_type IN ('TEMEL_CALISMA','YOGUN_TEKRAR','ZORLAYICI_DENEME')),
  difficulty_level TEXT NOT NULL
    CHECK (difficulty_level IN ('KOLAY','ORTA','ZOR')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  checksum TEXT,
  is_free_tier INTEGER NOT NULL DEFAULT 0 CHECK (is_free_tier IN (0,1)),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- bundle_path intentionally omitted locally: it is a server Storage
-- object reference the device no longer needs once the package has
-- been downloaded and imported.
-- is_free_tier: policy decision, not a license — mirrors the
-- PostgreSQL packages.is_free_tier column, independent of Entitlement.

CREATE INDEX IF NOT EXISTS idx_packages_exam_id ON packages(exam_id);
CREATE INDEX IF NOT EXISTS idx_packages_exam_type_difficulty
  ON packages(exam_id, package_type, difficulty_level);

CREATE TRIGGER IF NOT EXISTS trg_packages_set_updated_at
AFTER UPDATE ON packages
BEGIN
  UPDATE packages SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;


CREATE TABLE IF NOT EXISTS package_questions (
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (package_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_package_questions_question_id ON package_questions(question_id);


-- content_sync_state: device-local only, no Supabase equivalent. Records
-- which package_id/version/checksum combination has already had its
-- content (questions/question_options/package_questions) pulled, so a
-- future pull can skip re-downloading a package's content when the
-- server's current version/checksum for that package already matches
-- what's stored here. Added Phase 7A.2 — see SupabasePullSync.ts's
-- pullPackageContent for how this is written/read.
CREATE TABLE IF NOT EXISTS content_sync_state (
  package_id TEXT PRIMARY KEY REFERENCES packages(id) ON DELETE CASCADE,
  synced_version INTEGER NOT NULL,
  synced_checksum TEXT,
  question_count INTEGER NOT NULL CHECK (question_count >= 0),
  synced_at TEXT NOT NULL
);


-- ============================================================================
-- Group 2 — User / Access Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  account_status TEXT NOT NULL CHECK (account_status IN ('ANONYMOUS','REGISTERED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- No FK to auth.users — server-only, Supabase-managed concept. Holds
-- exactly one row locally: the current device session's own user.

CREATE TRIGGER IF NOT EXISTS trg_user_profiles_set_updated_at
AFTER UPDATE ON user_profiles
BEGIN
  UPDATE user_profiles SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;


CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PENDING','REVOKED','EXPIRED','RESTORED')),
  source TEXT NOT NULL CHECK (source IN ('APPLE','GOOGLE','ADMIN','PROMOTION')),
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Read-only local mirror. No local write path at the Repository layer —
-- SQLite has no RLS to enforce this at the database level, so the
-- guarantee here is entirely application-side.

CREATE INDEX IF NOT EXISTS idx_entitlements_user_exam ON entitlements(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_exam_id ON entitlements(exam_id);

CREATE TRIGGER IF NOT EXISTS trg_entitlements_set_updated_at
AFTER UPDATE ON entitlements
BEGIN
  UPDATE entitlements SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;


CREATE TABLE IF NOT EXISTS package_access (
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (entitlement_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_package_access_package_id ON package_access(package_id);


-- trial_access: added 2026-07-06 (Phase 2B.4) — capped, per-Question
-- free-trial grant, additive to packages.is_free_tier and independent
-- of entitlements. One row = one Question permanently unlocked for
-- that user via the trial mechanism. Cap (100 total per user),
-- idempotency, and content-eligibility (published, non-free-tier,
-- non-Deneme) are enforced server-side only (see
-- supabase/migrations/20260706000001_trial_access.sql) — this local
-- table is a synced read mirror with no local enforcement triggers,
-- same posture as package_access.
CREATE TABLE IF NOT EXISTS trial_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_trial_access_user_id ON trial_access(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_access_package_id ON trial_access(package_id);


-- ============================================================================
-- Group 3 — Activity Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS','COMPLETED','ABANDONED')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  score REAL,
  passed INTEGER CHECK (passed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  synced_at TEXT,
  -- synced_at: NULL = pending sync (not yet pushed to the server).
  --            non-NULL = successfully synchronized with the server.
  CHECK (status != 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_exam ON exam_sessions(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_synced_at ON exam_sessions(synced_at);

-- Safe against recursion structurally, not via the recursive_triggers
-- PRAGMA: this trigger only fires when status/started_at/completed_at/
-- score/passed are named in an UPDATE's SET clause. Its own corrective
-- write only names updated_at, which is excluded from that list, so it
-- can never re-satisfy its own firing condition.
CREATE TRIGGER IF NOT EXISTS trg_exam_sessions_set_updated_at
AFTER UPDATE OF status, started_at, completed_at, score, passed ON exam_sessions
BEGIN
  UPDATE exam_sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_exam_sessions_check_status_transition
BEFORE UPDATE OF status ON exam_sessions
WHEN OLD.status != NEW.status
BEGIN
  SELECT RAISE(ABORT, 'Invalid exam session status transition')
  WHERE NOT (OLD.status = 'IN_PROGRESS' AND NEW.status IN ('COMPLETED','ABANDONED'));
END;


CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  exam_session_id TEXT REFERENCES exam_sessions(id) ON DELETE SET NULL,
  sequence INTEGER,
  selected_option_id TEXT NOT NULL REFERENCES question_options(id) ON DELETE RESTRICT,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0,1)),
  server_verified_correct INTEGER CHECK (server_verified_correct IN (0,1)),
  server_verified_at TEXT,
  answered_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  synced_at TEXT,
  -- synced_at: NULL = pending sync (not yet pushed to the server).
  --            non-NULL = successfully synchronized with the server.
  CHECK (
    (exam_session_id IS NULL AND sequence IS NULL)
    OR (exam_session_id IS NOT NULL AND sequence IS NOT NULL)
  )
);
-- Immutable from the app's own write path, mirroring the server
-- posture: the local Repository only ever INSERTs, never UPDATEs.
-- server_verified_* fields arrive by pulling the server's result down
-- on sync, not from a local write initiated by the app itself.

CREATE INDEX IF NOT EXISTS idx_attempts_user_exam_question_answered
  ON attempts(user_id, exam_id, question_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_exam_session_id ON attempts(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_exam ON attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_synced_at ON attempts(synced_at);

-- Same non-recursive structure as above: only fires on
-- server_verified_correct/server_verified_at, and its own corrective
-- write only touches updated_at, which is outside that watched list.
CREATE TRIGGER IF NOT EXISTS trg_attempts_set_updated_at
AFTER UPDATE OF server_verified_correct, server_verified_at ON attempts
BEGIN
  UPDATE attempts SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_attempts_check_integrity
BEFORE INSERT ON attempts
BEGIN
  SELECT RAISE(ABORT, 'Attempt question must belong to the same exam')
  WHERE (SELECT exam_id FROM questions WHERE id = NEW.question_id) != NEW.exam_id;

  SELECT RAISE(ABORT, 'Selected option must belong to the attempted question')
  WHERE (SELECT question_id FROM question_options WHERE id = NEW.selected_option_id) != NEW.question_id;

  SELECT RAISE(ABORT, 'Exam session must match the attempt''s exam and user')
  WHERE NEW.exam_session_id IS NOT NULL
    AND (
      (SELECT exam_id FROM exam_sessions WHERE id = NEW.exam_session_id) != NEW.exam_id
      OR (SELECT user_id FROM exam_sessions WHERE id = NEW.exam_session_id) != NEW.user_id
    );
END;


-- ============================================================================
-- Group 4 — Derived / Analytics Model
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  topic_id TEXT REFERENCES topics(id) ON DELETE RESTRICT,
  metric_type TEXT NOT NULL,
  value REAL NOT NULL,
  computed_from TEXT,
  computed_to TEXT,
  computed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  synced_at TEXT
  -- synced_at: NULL = pending sync (not yet pushed to the server).
  --            non-NULL = successfully synchronized with the server.
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_metrics_topic_scoped
  ON learning_metrics(user_id, exam_id, topic_id, metric_type)
  WHERE topic_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_metrics_exam_scoped
  ON learning_metrics(user_id, exam_id, metric_type)
  WHERE topic_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_learning_metrics_synced_at ON learning_metrics(synced_at);

-- Same non-recursive structure: only fires on value/computed_from/
-- computed_to/computed_at, and its own corrective write only touches
-- updated_at, which is outside that watched list.
CREATE TRIGGER IF NOT EXISTS trg_learning_metrics_set_updated_at
AFTER UPDATE OF value, computed_from, computed_to, computed_at ON learning_metrics
BEGIN
  UPDATE learning_metrics SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_learning_metrics_check_topic_same_exam
BEFORE INSERT ON learning_metrics
WHEN NEW.topic_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Learning metric topic must belong to the same exam')
  WHERE (SELECT exam_id FROM topics WHERE id = NEW.topic_id) != NEW.exam_id;
END;


-- Repeat Pool: not a table — parity with PostgreSQL confirmed (latest
-- attempt wins, identical tie-breaker ordering, abandoned sessions
-- still count, no session-status filtering in either version).
CREATE VIEW IF NOT EXISTS repeat_pool AS
SELECT user_id, exam_id, question_id, id AS attempt_id
FROM (
  SELECT
    id, user_id, exam_id, question_id, is_correct,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, exam_id, question_id
      ORDER BY answered_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM attempts
) ranked
WHERE rn = 1 AND is_correct = 0;
