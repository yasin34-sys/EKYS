# Question JSON Format — Canonical v1

Status: MVP-interim authoring format for server-authored question content.
Not the final Editorial CMS (ADR-006) — this is the safe bridge until that exists.

## Scope

This document describes the **source JSON shape** authors use to prepare question
content. It does not describe the database schema in detail — see
Phase 4A.0/4A.0.1 audits for the surrounding pipeline design. A SQL generator
exists (`tools/content/generate-question-import-sql.mjs`) — see "The SQL
generator" below.

## Canonical v1 shape

Top-level object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `package` | string | yes | Human batch/authoring label (e.g. `"TYMM-001"`). Not a database `packages` row — see "package" vs `packages` below. |
| `type` | string | yes | `"topic_pack"` or `"mock_exam"` — see "Two top-level types" below. Unrecognized values are rejected, not silently accepted. |
| `topic` | string | required for `type: "topic_pack"`; not required for `type: "mock_exam"` | Pedagogical topic name. For `topic_pack`, every question's own `topic` field must match this exactly. `mock_exam` has no single top-level topic — see below. |
| `question_count` | integer | yes | Must equal `questions.length`. |
| `status` | string | no | One of `DRAFT` / `PUBLISHED` / `ARCHIVED`. **Absent means `DRAFT`** — see below. |
| `questions` | array | yes | Array of question objects, shape below. |

## Two top-level types

- **`topic_pack`** — a study package scoped to one pedagogical topic. All
  behavior described elsewhere in this document (single top-level `topic`,
  every question's `topic` must match it exactly) applies unchanged.
- **`mock_exam`** — a full practice exam ("Deneme") whose questions
  deliberately span several topics in one file (e.g. one 80-question file
  mixing `Genel Kültür`, `Mevzuat`, `Eğitim Bilimleri`, etc.). There is no
  top-level `topic` field; each question's own `topic` is required and
  validated individually instead. Everything else — `package`, `type`,
  `question_count`, `questions`, per-question required fields, id
  uniqueness, UTF-8/mojibake checks — is identical to `topic_pack`.
  `tools/content/generate-question-import-sql.mjs` additionally requires
  that a `mock_exam` source file's target `packages` row have
  `package_type = "ZORLAYICI_DENEME"` — a mock exam can only ever be sold
  as a "challenging practice exam" package, never `TEMEL_CALISMA` or
  `YOGUN_TEKRAR`.

Each entry in `questions[]`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable, permanent identifier (e.g. `"TYMM-000001"`). Must be globally unique across the entire content tree, not just within one file — the user's existing files already share a single running counter across topics (e.g. `TYMM-000001..000020`, then `GK-000021..`). Never renumber an `id` once it has been used. |
| `topic` | string | yes | For `topic_pack`, must equal the batch's top-level `topic`. For `mock_exam`, this is the question's own topic and is validated independently per question (no top-level value to compare against). |
| `subtopic` | string | yes | Pedagogical metadata. |
| `learning_outcome` | string | yes | Pedagogical metadata. |
| `difficulty` | integer | yes | Positive integer. |
| `bloom_level` | string | yes | Pedagogical metadata (e.g. `"Kavrama"`, `"Analiz"`). |
| `question_type` | string | yes | **Pedagogical metadata only** — see the dedicated warning below. Values seen so far: `Bilgi`, `Kavrama`, `Senaryolu`, `Uygulama`, `Analiz`. |
| `negative_stem` | boolean | yes | Whether the stem is a negative-form question ("... which is NOT ..."). |
| `question` | string | yes | The question stem. |
| `choices` | object | yes | Must have **exactly** keys `A`, `B`, `C`, `D`, `E`, each a non-empty string. |
| `answer` | string | yes | One of `A`–`E`; must be a key present in `choices`. |
| `explanation` | string | yes | Shown to the user after answering, once the app supports it (not yet — see below). |
| `quality_filters` | object | yes | Free-form authoring QA checklist (varies in which keys are present across files). Validated only as "is an object," not enumerated. |
| `quality_score` | integer | yes | Integer 0–100. |

## `status` defaults to `DRAFT`

None of the real files produced so far (`TYMM-001`..`006`, `GK-002`) include a
`status` field at all — this is a new, additive, optional field. If it is
absent, the content is treated as `DRAFT` when it is eventually imported.
Nothing is ever imported as `PUBLISHED` by default; that must be explicit in
the source file. This matches the project's conservative-by-default posture
(the question bank is still draft/preparation material, not final production
content).

## `"package"` (JSON) vs. `packages` (database table)

The JSON top-level `package` field (e.g. `"TYMM-001"`) is a **human authoring
batch label** — it identifies which file/writing session a question came
from. It is **not** the same thing as a row in the database `packages` table
(which has `package_type` ∈ `TEMEL_CALISMA`/`YOGUN_TEKRAR`/`ZORLAYICI_DENEME`,
a `difficulty_level`, and an `is_free_tier` flag, and is what the mobile app
actually purchases/unlocks). Deciding which app `packages` row a question
ends up assigned to (via `package_questions`) is a separate, later curatorial
step — this JSON format only describes the question content and its topic,
not its commercial packaging.

## The legacy shape (`GK-001`) is not canonical

One real file, `GK-001 Soru Paketi.json`, predates this format. It is a bare
JSON **array** (not an object), and each entry uses different field names:
`id`, `question`, `options` (not `choices`), `correct_answer` (not `answer`),
`tymm_skill`, `rationale` (not `explanation`) — and has none of `package`,
`type`, `topic`, `question_count`, `subtopic`, `learning_outcome`,
`bloom_level`, `negative_stem`, `quality_filters`, `quality_score`.

This shape is **not accepted** by the validator as-is. It needs a dedicated
conversion step before it can be treated as v1 content. The validator
detects this shape specifically and reports a dedicated message rather than
a generic schema error.

A standalone converter now exists:
`tools/content/convert-legacy-question-json.mjs` (also runnable as
`npm run content:convert-legacy --`). It reads one legacy array file and
writes one canonical v1 file, mapping `id->id`, `question->question`,
`options->choices`, `correct_answer->answer`, `rationale->explanation`,
`tymm_skill->learning_outcome` verbatim (no text is altered, reworded, or
reformatted). Metadata the legacy shape never had (`package`, `topic`,
`subtopic`, `difficulty`, `bloom_level`, `question_type`, `status`) is
supplied via required/optional CLI flags with conservative defaults
(status defaults to `DRAFT`; see the converter's `--help`-style usage text
for the full list). It refuses to overwrite an existing output file unless
`--force` is passed, and runs the canonical validator on its own output
before reporting success.

## Metadata retained in source, not imported (MVP)

The following fields are validated for shape but are **not written to any
database table** by this phase (there is no importer yet, and none is
planned to write these fields even once one exists, without a separate,
explicit future decision):

- `subtopic`
- `learning_outcome`
- `bloom_level`
- `question_type` (the pedagogical value — see warning below)
- `negative_stem`
- `explanation`
- `quality_filters`
- `quality_score`

They remain permanently available in the tracked source JSON file (git
history is the record for this MVP-interim phase). `explanation` is the one
field most likely to become a real, minimal, future column
(`questions.explanation`, nullable) since it is directly user-facing value —
but that is an explicit decision for a future migration-bearing phase, not
assumed here.

## Important: JSON `question_type` is not `questions.question_type`

The JSON `question_type` field is **pedagogical metadata**
(`Bilgi`/`Kavrama`/`Senaryolu`/`Uygulama`/`Analiz` — a Bloom's-taxonomy-style
classification of the question). It must never be written into the
database's `questions.question_type` column. That column is a fixed,
technical MVP value and must always remain `'SINGLE_CHOICE'` (the only value
the `questions` table's `check` constraint currently allows), regardless of
what the JSON's `question_type` says. An importer must treat
`questions.question_type` as a constant it sets itself, never a mapped
field.

## How `answer` maps to a correct option (later, at import time)

There is no per-choice `is_correct` boolean in this JSON format — correctness
is expressed entirely by the single `answer` field pointing at one of the
`choices` labels. When an importer is eventually built (a later phase, not
this one), it is expected to turn each `choices` entry into one
`question_options` row, and mark exactly the row whose label equals `answer`
as `is_correct = true` — mirroring the database's existing
`uq_question_options_one_correct` partial unique index, which allows at most
one `is_correct = true` row per question. Because v1 always requires exactly
one `answer` value that is one of the always-present `A`–`E` labels, this
invariant is structural in the source format, not something the importer
needs to separately enforce beyond validating `answer` is a real label.

## What exists after this phase

- This document.
- A standalone validator (`tools/content/validate-question-json.mjs`) that
  checks the rules above against v1 files and rejects/flags legacy files.
- Test fixtures under `tools/content/fixtures/`.
- A standalone SQL generator (`tools/content/generate-question-import-sql.mjs`,
  also runnable as `npm run content:generate-import-sql --`) — see below.

No Supabase writes and no real migrations exist yet — those remain future,
explicit, human-reviewed phases.

## The SQL generator (Phase 7A.3)

`tools/content/generate-question-import-sql.mjs` reads validated v1 source
JSON plus a small **import plan** JSON file, and writes plain, reviewable
PostgreSQL SQL (`BEGIN; ... COMMIT;`, `INSERT ... ON CONFLICT ... DO
UPDATE`) to a local output path. It never applies SQL, never writes to
`supabase/migrations`, never touches a live database, uses no Supabase
client, no env vars, and no network access — run `node
tools/content/generate-question-import-sql.mjs` with no arguments for full
usage text, including the import plan's JSON shape. A documented, non-
production example plan lives at `content/import-plans/example-plan.json`.

Two points worth calling out explicitly:

- **Source `id` values (e.g. `"GK-001-01"`) are never inserted as a
  Postgres `uuid` directly.** The generator derives a stable UUIDv5-style
  id from `(source package label, source question id)` (and similarly for
  topics and options) using a hand-rolled deterministic UUID helper over
  `node:crypto`'s SHA-1 — no external `uuid` package. The same source
  input always produces the same UUID, so re-running the generator on
  unchanged content produces byte-for-byte-identical id columns.
- **Which app `packages` row question content is assigned to remains an
  explicit, human-authored decision in the import plan** — the generator
  never infers `package_type`, `difficulty_level`, or `is_free_tier` from
  a file name or any other heuristic.
- **`type: "mock_exam"` files are supported** (Phase 7A.3.1): topics are
  resolved per question instead of once per file, and a `mock_exam` source
  file's `target_package_id` must resolve to a `package_type:
  "ZORLAYICI_DENEME"` package in the plan — the generator rejects the plan
  otherwise.
