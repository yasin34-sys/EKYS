#!/usr/bin/env node
// Question JSON -> reviewable PostgreSQL SQL generator (Phase 7A.3).
// See docs/content/QUESTION_JSON_FORMAT.md for the source JSON shape this
// reads, and printUsageAndExit() below for the import-plan JSON shape.
//
// This script's own comments and messages are plain ASCII, matching
// tools/content/validate-question-json.mjs's convention (see that file's
// header note for why).
//
// Dependency-light by design: built-in Node APIs only (fs, path, crypto,
// child_process). No Supabase client, no env vars, no network access. This
// tool NEVER applies SQL and NEVER writes to supabase/migrations -- it only
// reads local JSON and writes one local .sql file the operator reviews (and
// applies, later, by hand or via a separate explicit migration step).

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const VALIDATOR_PATH = resolve(SCRIPT_DIR, 'validate-question-json.mjs');

const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'];
const QUESTION_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const EXAM_STATUSES = ['DRAFT', 'INTERNAL', 'BETA', 'PUBLISHED', 'ARCHIVED'];
const TOPIC_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const PACKAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const PACKAGE_TYPES = ['TEMEL_CALISMA', 'YOGUN_TEKRAR', 'ZORLAYICI_DENEME'];
const DIFFICULTY_LEVELS = ['KOLAY', 'ORTA', 'ZOR'];

// Fixed, arbitrary namespace UUID for this tool's deterministic ids
// (RFC 4122 UUIDv5). Generated once with crypto.randomUUID() at authoring
// time and hardcoded here permanently -- it must never change, or every
// previously generated id would change with it.
const DETERMINISTIC_UUID_NAMESPACE = 'f3a4c9b2-6d1e-4a7f-9c3b-8e2d5f1a6c90';

function printUsageAndExit(code) {
  const usage = `
Usage:
  node tools/content/generate-question-import-sql.mjs \\
    --input <question-json-file-or-directory> \\
    --plan <import-plan.json> \\
    --output <output.sql> \\
    [--dry-run]   (print a summary, write nothing) \\
    [--force]     (required to overwrite an existing --output file)

What this does:
  1. Runs the existing canonical validator (validate-question-json.mjs) on
     --input. Stops with a nonzero exit if any file fails validation.
  2. Reads an import plan (see shape below), cross-checks it against the
     files found under --input, and builds an in-memory import model.
  3. Generates plain, reviewable SQL (wrapped in BEGIN; ... COMMIT;) using
     INSERT ... ON CONFLICT ... DO UPDATE. Never writes to
     supabase/migrations, never touches a live database, never reads env
     vars or the network.

Import plan JSON shape (see content/import-plans/example-plan.json for a
fully worked, documented fixture example):

{
  "exam": {
    "mode": "new",                 // or "existing"
    // --- required when mode is "new" ---
    "key": "STABLE-EXAM-KEY",      // stable key the exam's uuid is derived from
    "name": "Exam display name",
    "status": "DRAFT",             // DRAFT|INTERNAL|BETA|PUBLISHED|ARCHIVED
    "duration_minutes": 60,
    "passing_score": 50,
    "question_count": 20,          // explicit curatorial decision, not inferred
    // --- required when mode is "existing" ---
    "id": "<uuid-of-existing-exams-row>"
  },
  "topic_mapping": {
    "policy": "EXACT_NAME_MATCH",  // the only policy this tool supports today
    "topics": [
      { "name": "JSON topic field value", "display_order": 1, "status": "DRAFT" }
    ]
  },
  "packages": [
    {
      "id": "<uuid>",              // explicit -- never generated silently
      "package_type": "TEMEL_CALISMA",   // TEMEL_CALISMA|YOGUN_TEKRAR|ZORLAYICI_DENEME
      "difficulty_level": "ORTA",        // KOLAY|ORTA|ZOR
      "is_free_tier": false,
      "version": 1,
      "checksum": null,            // string or null -- never computed by this tool
      "status": "DRAFT",           // DRAFT|PUBLISHED|ARCHIVED
      "title": null,               // optional -- non-empty string or null/absent (defaults to null)
      "description": null          // optional -- non-empty string or null/absent (defaults to null)
    }
  ],
  "source_packages": [
    {
      "file": "some-file.json",          // matched by basename against --input
      "package_label": "GK-001",         // must equal that file's top-level "package"
      "target_package_id": "<uuid>"      // must be one of packages[].id above
    }
  ]
}

Every JSON file found under --input must be covered by exactly one
source_packages[] entry, and every source_packages[] entry must resolve to
a file that was actually found -- this tool never silently skips or infers
a mapping either direction.

Source files with top-level "type": "mock_exam" (see
docs/content/QUESTION_JSON_FORMAT.md) are supported alongside "topic_pack":
  - A mock_exam file has no single top-level topic -- each question's own
    "topic" is resolved against topic_mapping.topics individually, instead
    of once for the whole file.
  - A mock_exam source_packages[] entry's target_package_id must point at a
    packages[] entry with package_type "ZORLAYICI_DENEME" -- enforced by
    this tool, not left to the plan author to remember.
  - topic_pack behavior (single top-level topic, any package_type allowed)
    is unchanged.

packages[].title and packages[].description (Phase 7A.3.2) are optional,
user-facing display fields, independent of package_type/difficulty_level.
They are never inferred from a source file name or any other heuristic --
if omitted, they are written as SQL NULL and the client falls back to its
existing package_type-derived label, exactly as before this field existed.
`.trim();
  console.error(usage);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token === '--force') {
      args.force = true;
      continue;
    }
    if (!token.startsWith('--')) {
      console.error(`Unexpected argument: ${token}`);
      printUsageAndExit(2);
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      console.error(`Missing value for --${key}`);
      printUsageAndExit(2);
    }
    args[key] = value;
    i++;
  }
  return args;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStrictUtf8(path) {
  const buffer = readFileSync(path);
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}

// ---------------------------------------------------------------------------
// Deterministic UUIDs (RFC 4122 UUIDv5, hand-rolled over node:crypto's SHA-1
// -- no external uuid package). Same (namespace, name) input always produces
// the same UUID; different inputs practically never collide.
// ---------------------------------------------------------------------------

function uuidStringToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToUuidString(bytes) {
  const hex = Buffer.from(bytes).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function deterministicUuid(name, namespace = DETERMINISTIC_UUID_NAMESPACE) {
  const namespaceBytes = uuidStringToBytes(namespace);
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = createHash('sha1').update(Buffer.concat([namespaceBytes, nameBytes])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return bytesToUuidString(bytes);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function examUuid(key) {
  return deterministicUuid(`exam:v1:${key}`);
}
function topicUuid(examId, topicName) {
  return deterministicUuid(`topic:v1:${examId}:${topicName}`);
}
function questionUuid(packageLabel, sourceQuestionId) {
  return deterministicUuid(`question:v1:${packageLabel}:${sourceQuestionId}`);
}
function optionUuid(packageLabel, sourceQuestionId, label) {
  return deterministicUuid(`option:v1:${packageLabel}:${sourceQuestionId}:${label}`);
}

// ---------------------------------------------------------------------------
// Input file discovery (mirrors validate-question-json.mjs's walk, kept
// local and small because that script executes main() unconditionally at
// import time and cannot safely be imported as a library -- see below for
// how it's still reused, as a subprocess, for the actual validation step).
// ---------------------------------------------------------------------------

function listJsonFiles(inputPath) {
  const stat = statSync(inputPath);
  if (stat.isFile()) return [resolve(inputPath)];

  const files = [];
  function walk(path) {
    const entries = readdirSync(path, { withFileTypes: true });
    for (const entry of entries) {
      const childPath = join(path, entry.name);
      if (entry.isDirectory()) {
        walk(childPath);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.json') {
        files.push(resolve(childPath));
      }
    }
  }
  walk(inputPath);
  return files;
}

function runValidator(inputPath) {
  try {
    const output = execFileSync('node', [VALIDATOR_PATH, inputPath], { encoding: 'utf8' });
    console.log(output);
  } catch (err) {
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.error('Input failed canonical validation -- refusing to generate SQL.');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Import plan loading and validation
// ---------------------------------------------------------------------------

function loadPlan(planPath) {
  let text;
  try {
    text = readStrictUtf8(planPath);
  } catch (err) {
    console.error(`Cannot read plan as valid UTF-8: ${err.message}`);
    process.exit(1);
  }

  let plan;
  try {
    plan = JSON.parse(text);
  } catch (err) {
    console.error(`Invalid JSON in plan file: ${err.message}`);
    process.exit(1);
  }

  const errors = validatePlanShape(plan);
  if (errors.length > 0) {
    console.error('Import plan failed validation:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  return plan;
}

function validatePlanShape(plan) {
  const errors = [];

  if (!isPlainObject(plan)) {
    return ['Plan top level must be a JSON object'];
  }

  // --- exam ---
  const exam = plan.exam;
  if (!isPlainObject(exam)) {
    errors.push('"exam" must be an object');
  } else if (exam.mode === 'new') {
    if (typeof exam.key !== 'string' || exam.key.trim().length === 0) {
      errors.push('exam.key must be a non-empty string when exam.mode is "new"');
    }
    if (typeof exam.name !== 'string' || exam.name.trim().length === 0) {
      errors.push('exam.name must be a non-empty string when exam.mode is "new"');
    }
    if (!EXAM_STATUSES.includes(exam.status)) {
      errors.push(`exam.status must be one of ${EXAM_STATUSES.join('/')}, got ${JSON.stringify(exam.status)}`);
    }
    if (!Number.isInteger(exam.duration_minutes) || exam.duration_minutes <= 0) {
      errors.push('exam.duration_minutes must be a positive integer');
    }
    if (typeof exam.passing_score !== 'number' || exam.passing_score < 0) {
      errors.push('exam.passing_score must be a number >= 0');
    }
    if (!Number.isInteger(exam.question_count) || exam.question_count <= 0) {
      errors.push('exam.question_count must be a positive integer (explicit curatorial decision, not inferred)');
    }
  } else if (exam.mode === 'existing') {
    if (!isValidUuid(exam.id)) {
      errors.push('exam.id must be a valid uuid when exam.mode is "existing"');
    }
  } else {
    errors.push(`exam.mode must be "new" or "existing", got ${JSON.stringify(exam?.mode)}`);
  }

  // --- topic_mapping ---
  const topicMapping = plan.topic_mapping;
  if (!isPlainObject(topicMapping)) {
    errors.push('"topic_mapping" must be an object');
  } else {
    if (topicMapping.policy !== 'EXACT_NAME_MATCH') {
      errors.push(
        `topic_mapping.policy must be "EXACT_NAME_MATCH" (the only supported policy), got ${JSON.stringify(topicMapping.policy)}`
      );
    }
    if (!Array.isArray(topicMapping.topics) || topicMapping.topics.length === 0) {
      errors.push('topic_mapping.topics must be a non-empty array');
    } else {
      const seenNames = new Set();
      topicMapping.topics.forEach((t, i) => {
        if (!isPlainObject(t)) {
          errors.push(`topic_mapping.topics[${i}] must be an object`);
          return;
        }
        if (typeof t.name !== 'string' || t.name.trim().length === 0) {
          errors.push(`topic_mapping.topics[${i}].name must be a non-empty string`);
        } else if (seenNames.has(t.name)) {
          errors.push(`topic_mapping.topics[${i}].name is a duplicate: ${JSON.stringify(t.name)}`);
        } else {
          seenNames.add(t.name);
        }
        if (!Number.isInteger(t.display_order)) {
          errors.push(`topic_mapping.topics[${i}].display_order must be an integer`);
        }
        if (!TOPIC_STATUSES.includes(t.status)) {
          errors.push(`topic_mapping.topics[${i}].status must be one of ${TOPIC_STATUSES.join('/')}`);
        }
      });
    }
  }

  // --- packages ---
  const packages = plan.packages;
  if (!Array.isArray(packages) || packages.length === 0) {
    errors.push('"packages" must be a non-empty array');
  } else {
    const seenIds = new Set();
    packages.forEach((p, i) => {
      if (!isPlainObject(p)) {
        errors.push(`packages[${i}] must be an object`);
        return;
      }
      if (!isValidUuid(p.id)) {
        errors.push(`packages[${i}].id must be a valid uuid (explicit, not generated), got ${JSON.stringify(p.id)}`);
      } else if (seenIds.has(p.id)) {
        errors.push(`packages[${i}].id is a duplicate: ${p.id}`);
      } else {
        seenIds.add(p.id);
      }
      if (!PACKAGE_TYPES.includes(p.package_type)) {
        errors.push(`packages[${i}].package_type must be one of ${PACKAGE_TYPES.join('/')}`);
      }
      if (!DIFFICULTY_LEVELS.includes(p.difficulty_level)) {
        errors.push(`packages[${i}].difficulty_level must be one of ${DIFFICULTY_LEVELS.join('/')}`);
      }
      if (typeof p.is_free_tier !== 'boolean') {
        errors.push(`packages[${i}].is_free_tier must be a boolean`);
      }
      if (!Number.isInteger(p.version) || p.version <= 0) {
        errors.push(`packages[${i}].version must be a positive integer`);
      }
      if (!('checksum' in p) || (p.checksum !== null && typeof p.checksum !== 'string')) {
        errors.push(`packages[${i}].checksum must be present and be a string or null`);
      }
      if (!PACKAGE_STATUSES.includes(p.status)) {
        errors.push(`packages[${i}].status must be one of ${PACKAGE_STATUSES.join('/')}`);
      }
      // title/description are optional (nullable columns, safe fallback to
      // the client's package_type label when absent) -- but if present,
      // must be well-formed, not silently-accepted garbage.
      if ('title' in p && p.title !== null && (typeof p.title !== 'string' || p.title.trim().length === 0)) {
        errors.push(`packages[${i}].title must be a non-empty string or null, got ${JSON.stringify(p.title)}`);
      }
      if (
        'description' in p &&
        p.description !== null &&
        (typeof p.description !== 'string' || p.description.trim().length === 0)
      ) {
        errors.push(`packages[${i}].description must be a non-empty string or null, got ${JSON.stringify(p.description)}`);
      }
    });
  }

  // --- source_packages ---
  const sourcePackages = plan.source_packages;
  const packageIds = Array.isArray(packages) ? new Set(packages.filter(isPlainObject).map((p) => p.id)) : new Set();
  if (!Array.isArray(sourcePackages) || sourcePackages.length === 0) {
    errors.push('"source_packages" must be a non-empty array');
  } else {
    const seenFiles = new Set();
    sourcePackages.forEach((s, i) => {
      if (!isPlainObject(s)) {
        errors.push(`source_packages[${i}] must be an object`);
        return;
      }
      if (typeof s.file !== 'string' || s.file.trim().length === 0) {
        errors.push(`source_packages[${i}].file must be a non-empty string`);
      } else if (seenFiles.has(s.file)) {
        errors.push(`source_packages[${i}].file is a duplicate: ${s.file}`);
      } else {
        seenFiles.add(s.file);
      }
      if (typeof s.package_label !== 'string' || s.package_label.trim().length === 0) {
        errors.push(`source_packages[${i}].package_label must be a non-empty string`);
      }
      if (!isValidUuid(s.target_package_id)) {
        errors.push(`source_packages[${i}].target_package_id must be a valid uuid`);
      } else if (!packageIds.has(s.target_package_id)) {
        errors.push(`source_packages[${i}].target_package_id (${s.target_package_id}) is not one of packages[].id`);
      }
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Building the in-memory import model
// ---------------------------------------------------------------------------

function buildModel(plan, inputFiles) {
  const errors = [];

  const examId = plan.exam.mode === 'existing' ? plan.exam.id : examUuid(plan.exam.key);

  const topicIdByName = new Map();
  for (const t of plan.topic_mapping.topics) {
    topicIdByName.set(t.name, topicUuid(examId, t.name));
  }

  const packageById = new Map(plan.packages.map((p) => [p.id, p]));

  // Match every discovered input file to exactly one source_packages entry
  // by basename, and vice versa -- no silent skips either direction.
  const sourceByBasename = new Map(plan.source_packages.map((s) => [basename(s.file), s]));
  const fileBasenames = new Set(inputFiles.map((f) => basename(f)));

  for (const f of inputFiles) {
    if (!sourceByBasename.has(basename(f))) {
      errors.push(`Input file has no source_packages[] mapping: ${f}`);
    }
  }
  for (const s of plan.source_packages) {
    if (!fileBasenames.has(basename(s.file))) {
      errors.push(`source_packages[] entry references a file not found under --input: ${s.file}`);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  // Iterate in plan order (source_packages array order) for deterministic
  // package_questions.display_order.
  const displayOrderCounter = new Map(); // packageId -> next display_order

  const topicsOut = [];
  for (const t of plan.topic_mapping.topics) {
    topicsOut.push({
      id: topicIdByName.get(t.name),
      examId,
      name: t.name,
      displayOrder: t.display_order,
      status: t.status,
    });
  }

  const packagesOut = plan.packages.map((p) => ({
    id: p.id,
    examId,
    packageType: p.package_type,
    difficultyLevel: p.difficulty_level,
    version: p.version,
    checksum: p.checksum,
    isFreeTier: p.is_free_tier,
    status: p.status,
    title: 'title' in p ? p.title : null,
    description: 'description' in p ? p.description : null,
  }));

  const questionsOut = [];
  const optionsOut = [];
  const packageQuestionsOut = [];
  let totalQuestionsImported = 0;

  for (const sourceEntry of plan.source_packages) {
    const filePath = inputFiles.find((f) => basename(f) === basename(sourceEntry.file));
    let doc;
    try {
      doc = JSON.parse(readStrictUtf8(filePath));
    } catch (err) {
      errors.push(`${filePath}: failed to re-read as JSON after validation: ${err.message}`);
      continue;
    }

    if (doc.package !== sourceEntry.package_label) {
      errors.push(
        `${filePath}: file's "package" (${JSON.stringify(doc.package)}) does not match ` +
          `source_packages[].package_label (${JSON.stringify(sourceEntry.package_label)})`
      );
      continue;
    }

    const isMockExam = doc.type === 'mock_exam';

    // topic_pack: one topic for the whole file, checked once up front.
    // mock_exam: no single top-level topic -- each question carries its
    // own topic instead, checked per-question below.
    if (!isMockExam && !topicIdByName.has(doc.topic)) {
      errors.push(
        `${filePath}: file's "topic" (${JSON.stringify(doc.topic)}) is not present in ` +
          `topic_mapping.topics -- add it explicitly or fix the plan`
      );
      continue;
    }
    const targetPackage = packageById.get(sourceEntry.target_package_id);
    if (!targetPackage) {
      errors.push(`${filePath}: target_package_id ${sourceEntry.target_package_id} not found in packages[]`);
      continue;
    }

    // mock_exam content is always the challenging "full practice exam"
    // product, never a plain topic study package or repetition package --
    // enforced here rather than left to plan-author discretion.
    if (isMockExam && targetPackage.package_type !== 'ZORLAYICI_DENEME') {
      errors.push(
        `${filePath}: type="mock_exam" source files may only map to a ZORLAYICI_DENEME package ` +
          `(target_package_id ${targetPackage.id} is ${targetPackage.package_type})`
      );
      continue;
    }

    const status = 'status' in doc ? doc.status : 'DRAFT';
    if (!QUESTION_STATUSES.includes(status)) {
      errors.push(`${filePath}: resolved question status ${JSON.stringify(status)} is not valid`);
      continue;
    }

    if (!displayOrderCounter.has(targetPackage.id)) displayOrderCounter.set(targetPackage.id, 1);

    for (const q of doc.questions) {
      const questionTopic = isMockExam ? q.topic : doc.topic;
      if (!topicIdByName.has(questionTopic)) {
        errors.push(
          `${filePath}: question ${q.id}'s topic (${JSON.stringify(questionTopic)}) is not present in ` +
            `topic_mapping.topics -- add it explicitly or fix the plan`
        );
        continue;
      }
      const topicId = topicIdByName.get(questionTopic);

      const qId = questionUuid(sourceEntry.package_label, q.id);
      questionsOut.push({
        id: qId,
        examId,
        topicId,
        body: q.question,
        status,
        sourceFile: filePath,
        sourceId: q.id,
      });

      for (const label of CHOICE_LABELS) {
        optionsOut.push({
          id: optionUuid(sourceEntry.package_label, q.id, label),
          questionId: qId,
          label,
          body: q.choices[label],
          isCorrect: q.answer === label,
          displayOrder: CHOICE_LABELS.indexOf(label) + 1,
        });
      }

      const nextOrder = displayOrderCounter.get(targetPackage.id);
      packageQuestionsOut.push({
        packageId: targetPackage.id,
        questionId: qId,
        displayOrder: nextOrder,
      });
      displayOrderCounter.set(targetPackage.id, nextOrder + 1);

      totalQuestionsImported++;
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  if (plan.exam.mode === 'new' && plan.exam.question_count !== totalQuestionsImported) {
    console.warn(
      `(warn) exam.question_count in the plan is ${plan.exam.question_count}, but this run is importing ` +
        `${totalQuestionsImported} question(s). This is not fatal -- exams.question_count is a curatorial ` +
        `field, not a computed constraint -- but double-check it is intentional.`
    );
  }

  return {
    errors: [],
    examInsert: plan.exam.mode === 'new' ? { id: examId, ...plan.exam } : null,
    examId,
    topics: topicsOut,
    packages: packagesOut,
    questions: questionsOut,
    options: optionsOut,
    packageQuestions: packageQuestionsOut,
  };
}

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}
function sqlBool(value) {
  return value ? 'true' : 'false';
}
function sqlInt(value) {
  return String(Math.trunc(value));
}
function sqlNumber(value) {
  return String(value);
}

function generateSql(model) {
  const lines = [];
  lines.push('-- Generated by tools/content/generate-question-import-sql.mjs');
  lines.push('-- Reviewable SQL only -- this file has NOT been applied to any database.');
  lines.push('-- Do not run this against production without a separate, explicit review step.');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  if (model.examInsert) {
    const e = model.examInsert;
    lines.push('-- Exam');
    lines.push(
      `INSERT INTO exams (id, name, status, question_count, duration_minutes, passing_score) VALUES (` +
        `${sqlString(e.id)}, ${sqlString(e.name)}, ${sqlString(e.status)}, ${sqlInt(e.question_count)}, ` +
        `${sqlInt(e.duration_minutes)}, ${sqlNumber(e.passing_score)})`
    );
    lines.push(
      `ON CONFLICT (id) DO UPDATE SET name = excluded.name, status = excluded.status, ` +
        `question_count = excluded.question_count, duration_minutes = excluded.duration_minutes, ` +
        `passing_score = excluded.passing_score;`
    );
  } else {
    lines.push(`-- Exam: assumed to already exist (exam.mode = "existing"), id = ${model.examId}. Not inserted.`);
  }
  lines.push('');

  lines.push('-- Topics');
  for (const t of model.topics) {
    lines.push(
      `INSERT INTO topics (id, exam_id, name, display_order, status) VALUES (` +
        `${sqlString(t.id)}, ${sqlString(t.examId)}, ${sqlString(t.name)}, ${sqlInt(t.displayOrder)}, ${sqlString(t.status)})`
    );
    lines.push(
      `ON CONFLICT (id) DO UPDATE SET name = excluded.name, display_order = excluded.display_order, status = excluded.status;`
    );
  }
  lines.push('');

  lines.push('-- Packages');
  for (const p of model.packages) {
    lines.push(
      `INSERT INTO packages (id, exam_id, package_type, difficulty_level, version, checksum, is_free_tier, status, title, description) VALUES (` +
        `${sqlString(p.id)}, ${sqlString(p.examId)}, ${sqlString(p.packageType)}, ${sqlString(p.difficultyLevel)}, ` +
        `${sqlInt(p.version)}, ${sqlString(p.checksum)}, ${sqlBool(p.isFreeTier)}, ${sqlString(p.status)}, ` +
        `${sqlString(p.title)}, ${sqlString(p.description)})`
    );
    lines.push(
      `ON CONFLICT (id) DO UPDATE SET package_type = excluded.package_type, ` +
        `difficulty_level = excluded.difficulty_level, version = excluded.version, checksum = excluded.checksum, ` +
        `is_free_tier = excluded.is_free_tier, status = excluded.status, title = excluded.title, ` +
        `description = excluded.description;`
    );
  }
  lines.push('');

  lines.push('-- Questions');
  for (const q of model.questions) {
    lines.push(`-- source: ${q.sourceFile} (source id ${q.sourceId})`);
    lines.push(
      `INSERT INTO questions (id, exam_id, topic_id, question_type, body, status) VALUES (` +
        `${sqlString(q.id)}, ${sqlString(q.examId)}, ${sqlString(q.topicId)}, 'SINGLE_CHOICE', ` +
        `${sqlString(q.body)}, ${sqlString(q.status)})`
    );
    lines.push(`ON CONFLICT (id) DO UPDATE SET topic_id = excluded.topic_id, body = excluded.body, status = excluded.status;`);
  }
  lines.push('');

  lines.push('-- Question options');
  const optionsByQuestion = new Map();
  for (const o of model.options) {
    if (!optionsByQuestion.has(o.questionId)) optionsByQuestion.set(o.questionId, []);
    optionsByQuestion.get(o.questionId).push(o);
  }
  for (const [questionId, options] of optionsByQuestion) {
    // Clear existing is_correct flags first so the partial unique index
    // (at most one is_correct = true row per question) can never be
    // transiently violated if a re-import changes which option is correct.
    lines.push(`UPDATE question_options SET is_correct = false WHERE question_id = ${sqlString(questionId)};`);
    for (const o of options) {
      lines.push(
        `INSERT INTO question_options (id, question_id, label, body, is_correct, display_order) VALUES (` +
          `${sqlString(o.id)}, ${sqlString(o.questionId)}, ${sqlString(o.label)}, ${sqlString(o.body)}, ` +
          `${sqlBool(o.isCorrect)}, ${sqlInt(o.displayOrder)})`
      );
      lines.push(
        `ON CONFLICT (id) DO UPDATE SET body = excluded.body, is_correct = excluded.is_correct, ` +
          `display_order = excluded.display_order;`
      );
    }
  }
  lines.push('');

  lines.push('-- Package questions');
  for (const pq of model.packageQuestions) {
    lines.push(
      `INSERT INTO package_questions (package_id, question_id, display_order) VALUES (` +
        `${sqlString(pq.packageId)}, ${sqlString(pq.questionId)}, ${sqlInt(pq.displayOrder)})`
    );
    lines.push(`ON CONFLICT (package_id, question_id) DO UPDATE SET display_order = excluded.display_order;`);
  }
  lines.push('');

  lines.push('COMMIT;');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  const missingRequired = ['input', 'plan', 'output'].filter((k) => !(k in args));
  if (missingRequired.length > 0) {
    console.error(`Missing required option(s): ${missingRequired.map((k) => `--${k}`).join(', ')}\n`);
    printUsageAndExit(2);
  }

  const inputPath = resolve(args.input);
  const planPath = resolve(args.plan);
  const outputPath = resolve(args.output);

  if (!existsSync(inputPath)) {
    console.error(`--input path does not exist: ${inputPath}`);
    process.exit(1);
  }
  if (!existsSync(planPath)) {
    console.error(`--plan path does not exist: ${planPath}`);
    process.exit(1);
  }

  console.log(`Validating input with the canonical validator...\n`);
  runValidator(inputPath);

  const plan = loadPlan(planPath);
  const inputFiles = listJsonFiles(inputPath);

  const model = buildModel(plan, inputFiles);
  if (model.errors.length > 0) {
    console.error('Cannot build import model:');
    for (const e of model.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const sql = generateSql(model);

  console.log('Import summary:');
  console.log(`  exam: ${model.examInsert ? 'new (will be inserted)' : 'existing (assumed present)'} -- id ${model.examId}`);
  console.log(`  topics: ${model.topics.length}`);
  console.log(`  packages: ${model.packages.length}`);
  console.log(`  questions: ${model.questions.length}`);
  console.log(`  question_options: ${model.options.length}`);
  console.log(`  package_questions: ${model.packageQuestions.length}`);
  console.log(`  output path: ${outputPath}`);

  if (args.dryRun) {
    console.log('\n--dry-run given: SQL was generated in memory but nothing was written.');
    process.exit(0);
  }

  if (existsSync(outputPath) && !args.force) {
    console.error(`\nOutput file already exists: ${outputPath}\nRefusing to overwrite without --force.`);
    process.exit(1);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, sql, 'utf8');
  console.log(`\nWrote SQL to ${outputPath}`);
  process.exit(0);
}

main();
