#!/usr/bin/env node
// Standalone converter: legacy GK-001-style array JSON -> canonical v1
// question JSON. See docs/content/QUESTION_JSON_FORMAT.md for both shapes.
//
// This script's own comments and messages are plain ASCII, matching
// tools/content/validate-question-json.mjs's convention (see that file's
// header note for why).
//
// Dependency-light by design: built-in Node APIs only. No network access,
// no Supabase client -- this never touches live data. This script only
// reads one local file and writes one local file; it never scans a whole
// directory (Downloads in particular is explicitly out of bounds here).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'];
const LEGACY_REQUIRED_FIELDS = ['id', 'question', 'options', 'correct_answer', 'tymm_skill', 'rationale'];

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const VALIDATOR_PATH = resolve(SCRIPT_DIR, 'validate-question-json.mjs');

function printUsageAndExit(code) {
  const usage = `
Usage:
  node tools/content/convert-legacy-question-json.mjs \\
    --input <legacy-array.json> \\
    --output <canonical-v1-output.json> \\
    --package <PACKAGE-LABEL> \\
    --topic <TOPIC NAME> \\
    [--status DRAFT|PUBLISHED|ARCHIVED]   (default: DRAFT) \\
    [--subtopic <TEXT>]                   (default: same as --topic) \\
    [--difficulty <1-5 integer>]          (default: 3) \\
    [--bloom-level <TEXT>]                (default: "Belirsiz") \\
    [--question-type <TEXT>]              (default: "Belirsiz") \\
    [--id-prefix <TEXT>]                  (default: none -- ids preserved exactly) \\
    [--force]                             (overwrite output if it already exists)

Required: --input, --output, --package, --topic.

Does not alter question text, option text, the answer, or the explanation
text in any way -- it only reshapes the legacy array into canonical v1 and
fills in metadata that legacy files never had, from the CLI options above
(or their documented defaults).
`.trim();
  console.error(usage);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
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

/**
 * Reads a file as strict UTF-8. Throws if the bytes are not valid UTF-8,
 * rather than silently substituting replacement characters.
 */
function readStrictUtf8(path) {
  const buffer = readFileSync(path);
  return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}

/**
 * Validates that `doc` is the legacy GK-001-style shape (a bare array of
 * objects with the fields listed in LEGACY_REQUIRED_FIELDS) before any
 * conversion is attempted. Returns a list of error strings; empty means
 * valid.
 */
function validateLegacyShape(doc) {
  const errors = [];

  if (!Array.isArray(doc)) {
    errors.push('Input is not a bare JSON array -- this converter only accepts the legacy array shape.');
    return errors;
  }

  if (doc.length === 0) {
    errors.push('Input array is empty -- nothing to convert.');
    return errors;
  }

  doc.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(`item[${index}]: must be an object`);
      return;
    }

    const missing = LEGACY_REQUIRED_FIELDS.filter((f) => !(f in item));
    if (missing.length > 0) {
      errors.push(`item[${index}] (id=${item.id ?? '?'}): missing legacy field(s): ${missing.join(', ')}`);
    }

    if ('id' in item && (typeof item.id !== 'string' || item.id.trim().length === 0)) {
      errors.push(`item[${index}]: "id" must be a non-empty string`);
    }

    if ('options' in item) {
      if (!isPlainObject(item.options)) {
        errors.push(`item[${index}] (id=${item.id ?? '?'}): "options" must be an object`);
      } else {
        const keys = Object.keys(item.options).sort();
        const expected = [...CHOICE_LABELS].sort();
        const sameKeys = keys.length === expected.length && keys.every((k, i) => k === expected[i]);
        if (!sameKeys) {
          errors.push(
            `item[${index}] (id=${item.id ?? '?'}): "options" must have exactly keys A,B,C,D,E, got ${keys.join(',') || '(none)'}`
          );
        }
      }
    }

    if ('correct_answer' in item && (typeof item.correct_answer !== 'string' || !CHOICE_LABELS.includes(item.correct_answer))) {
      errors.push(`item[${index}] (id=${item.id ?? '?'}): "correct_answer" must be one of A-E, got ${JSON.stringify(item.correct_answer)}`);
    }
  });

  return errors;
}

/**
 * Converts one legacy item into a canonical v1 question object. Every
 * field taken directly from the legacy item (question, options values,
 * correct_answer, rationale, tymm_skill, id) is copied verbatim -- no
 * trimming, no rewording, no reformatting.
 */
function convertQuestion(item, options) {
  const id = options.idPrefix ? `${options.idPrefix}${item.id}` : item.id;

  return {
    id,
    topic: options.topic,
    subtopic: options.subtopic,
    learning_outcome: item.tymm_skill,
    difficulty: options.difficulty,
    bloom_level: options.bloomLevel,
    question_type: options.questionType,
    negative_stem: false,
    question: item.question,
    choices: { ...item.options },
    answer: item.correct_answer,
    explanation: item.rationale,
    quality_filters: {},
    quality_score: 0,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const missingRequired = ['input', 'output', 'package', 'topic'].filter((k) => !(k in args));
  if (missingRequired.length > 0) {
    console.error(`Missing required option(s): ${missingRequired.map((k) => `--${k}`).join(', ')}\n`);
    printUsageAndExit(2);
  }

  const status = args.status ?? 'DRAFT';
  if (!VALID_STATUSES.includes(status)) {
    console.error(`Invalid --status "${status}" (must be one of ${VALID_STATUSES.join('/')})`);
    process.exit(2);
  }

  const difficulty = args.difficulty !== undefined ? Number(args.difficulty) : 3;
  if (!Number.isInteger(difficulty) || difficulty <= 0) {
    console.error(`Invalid --difficulty "${args.difficulty}" (must be a positive integer)`);
    process.exit(2);
  }

  const convertOptions = {
    topic: args.topic,
    subtopic: args.subtopic ?? args.topic,
    difficulty,
    bloomLevel: args['bloom-level'] ?? 'Belirsiz',
    questionType: args['question-type'] ?? 'Belirsiz',
    idPrefix: args['id-prefix'] ?? '',
  };

  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);

  if (existsSync(outputPath) && !args.force) {
    console.error(`Output file already exists: ${outputPath}\nRefusing to overwrite without --force.`);
    process.exit(1);
  }

  let text;
  try {
    text = readStrictUtf8(inputPath);
  } catch (err) {
    console.error(`Cannot read input as valid UTF-8: ${err.message}`);
    process.exit(1);
  }

  let legacyDoc;
  try {
    legacyDoc = JSON.parse(text);
  } catch (err) {
    console.error(`Invalid JSON in input file: ${err.message}`);
    process.exit(1);
  }

  const legacyErrors = validateLegacyShape(legacyDoc);
  if (legacyErrors.length > 0) {
    console.error(`Input does not look like the legacy shape this converter accepts:`);
    for (const e of legacyErrors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const questions = legacyDoc.map((item) => convertQuestion(item, convertOptions));

  const canonicalDoc = {
    package: args.package,
    type: 'topic_pack',
    topic: args.topic,
    question_count: questions.length,
    status,
    questions,
  };

  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(outputPath, JSON.stringify(canonicalDoc, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${questions.length} question(s) to ${outputPath}`);

  console.log(`\nRunning canonical validator on the output...\n`);
  try {
    const validatorOutput = execFileSync('node', [VALIDATOR_PATH, outputPath], { encoding: 'utf8' });
    console.log(validatorOutput);
  } catch (err) {
    // execFileSync throws on non-zero exit; its stdout/stderr are still
    // available on the error object and are what we want the operator to see.
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.error('Conversion succeeded structurally, but the converted output failed canonical validation.');
    process.exit(1);
  }

  console.log('Conversion complete and output passed canonical validation.');
  process.exit(0);
}

main();
