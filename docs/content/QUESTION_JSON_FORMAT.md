# Question JSON Format — Canonical v1

Status: MVP-interim authoring format for server-authored question content.
Not the final Editorial CMS (ADR-006) — this is the safe bridge until that exists.

## Scope

This document describes the **source JSON shape** authors use to prepare question
content. It does not describe a database schema or an import mechanism — see
Phase 4A.0/4A.0.1 audits for the surrounding pipeline design. As of this phase,
there is no importer yet: only documentation and a validator exist.

## Canonical v1 shape

Top-level object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `package` | string | yes | Human batch/authoring label (e.g. `"TYMM-001"`). Not a database `packages` row — see "package" vs `packages` below. |
| `type` | string | yes | Must be `"topic_pack"` in v1. Unrecognized values are rejected, not silently accepted. |
| `topic` | string | yes | Pedagogical topic name. Every question's own `topic` field must match this exactly. |
| `question_count` | integer | yes | Must equal `questions.length`. |
| `status` | string | no | One of `DRAFT` / `PUBLISHED` / `ARCHIVED`. **Absent means `DRAFT`** — see below. |
| `questions` | array | yes | Array of question objects, shape below. |

Each entry in `questions[]`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable, permanent identifier (e.g. `"TYMM-000001"`). Must be globally unique across the entire content tree, not just within one file — the user's existing files already share a single running counter across topics (e.g. `TYMM-000001..000020`, then `GK-000021..`). Never renumber an `id` once it has been used. |
| `topic` | string | yes | Must equal the batch's top-level `topic`. |
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
conversion step (planned, not built in this phase) before it can be treated
as v1 content. The validator detects this shape specifically and reports a
dedicated message rather than a generic schema error.

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

No importer, no SQL generator, no Supabase writes, and no migrations exist
yet — those remain future phases.
