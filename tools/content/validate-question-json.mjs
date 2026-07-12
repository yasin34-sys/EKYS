#!/usr/bin/env node
// Standalone validator for the canonical v1 question JSON format.
// See docs/content/QUESTION_JSON_FORMAT.md for the format this checks.
//
// Dependency-light by design: built-in Node APIs only (fs, path, url).
// No network access, no Supabase client -- this never touches live data.
//
// NOTE ON THIS FILE'S ENCODING: this script's own comments and user-facing
// messages are written in plain ASCII on purpose (even though the source
// files it validates are UTF-8 Turkish text). That is a defensive choice,
// not a requirement of the format -- a script full of literal accented
// characters is one more place a bad copy/paste or a misconfigured editor
// could silently reintroduce mojibake into this repo. Keeping this file's
// own text ASCII removes that risk for the tool itself.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

// "topic" is required only for type="topic_pack" -- see the type-specific
// check in validateDocument(). type="mock_exam" files carry topic per
// question instead (questions may span several topics).
const REQUIRED_TOP_LEVEL_FIELDS = ['package', 'type', 'question_count', 'questions'];
const VALID_TOP_LEVEL_TYPES = ['topic_pack', 'mock_exam'];
const REQUIRED_QUESTION_FIELDS = [
  'id',
  'topic',
  'subtopic',
  'learning_outcome',
  'difficulty',
  'bloom_level',
  'question_type',
  'negative_stem',
  'question',
  'choices',
  'answer',
  'explanation',
  'quality_filters',
  'quality_score',
];
const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'];
const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const MAX_FILES_SOFT_CAP = 5000;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findJsonFiles(inputPaths) {
  const files = [];
  const visitedDirs = new Set();

  function walk(path) {
    if (files.length > MAX_FILES_SOFT_CAP) return;

    let stat;
    try {
      stat = statSync(path);
    } catch (err) {
      console.warn(`  [skip] cannot stat ${path}: ${err.message}`);
      return;
    }

    if (stat.isDirectory()) {
      const real = resolve(path);
      if (visitedDirs.has(real)) return;
      visitedDirs.add(real);

      let entries;
      try {
        entries = readdirSync(path, { withFileTypes: true });
      } catch (err) {
        console.warn(`  [skip] cannot read directory ${path}: ${err.message}`);
        return;
      }

      for (const entry of entries) {
        if (files.length > MAX_FILES_SOFT_CAP) {
          console.warn(`  [warn] more than ${MAX_FILES_SOFT_CAP} files found, stopping traversal early.`);
          return;
        }
        const childPath = join(path, entry.name);
        if (entry.isDirectory()) {
          walk(childPath);
        } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.json') {
          files.push(childPath);
        }
      }
    } else if (stat.isFile()) {
      // A file passed explicitly is checked regardless of extension --
      // only directory recursion filters by .json.
      files.push(path);
    }
  }

  for (const p of inputPaths) walk(p);
  return files;
}

/**
 * Decodes a file's bytes as strict UTF-8. Throws if the bytes are not
 * valid UTF-8 (fs.readFileSync('utf8') would silently replace invalid
 * sequences with U+FFFD instead of telling us anything went wrong).
 */
function readStrictUtf8(path) {
  const buffer = readFileSync(path);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return decoder.decode(buffer);
}

// ---------------------------------------------------------------------------
// Mojibake detection
// ---------------------------------------------------------------------------
// INTENTIONAL: everything in this section deliberately deals with mis-encoded
// text. Windows-1252-flavored mojibake (correct UTF-8 bytes later misread one
// byte at a time as Windows-1252, then re-saved as UTF-8) turns e.g. "Ornek"
// with a real O-umlaut into the two characters "A-tilde" + "central-European
// hyphen-like glyph" side by side. The table and characters below exist to
// *recognize* that pattern; they are not themselves encoding mistakes.
//
// CP1252_HIGH_TO_CODEPOINT maps the Windows-1252 byte values 0x80-0x9F to the
// Unicode code points they represent (bytes 0xA0-0xFF are identical to
// Latin-1/Unicode in Windows-1252, so they need no table). This is public,
// standard codepage data, not project-specific.
const CP1252_HIGH_TO_CODEPOINT = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};
const CODEPOINT_TO_CP1252_HIGH_BYTE = new Map(
  Object.entries(CP1252_HIGH_TO_CODEPOINT).map(([byte, codePoint]) => [codePoint, Number(byte)])
);

/**
 * Returns the single Windows-1252 byte value that would produce `char` if
 * decoded under that codepage, or null if `char` cannot come from a single
 * Windows-1252 byte at all (i.e. it is "outside" that codepage entirely).
 */
function charToWindows1252Byte(char) {
  const codePoint = char.codePointAt(0);
  if (codePoint < 0x80) return codePoint; // plain ASCII, byte-identical
  if (codePoint >= 0xa0 && codePoint <= 0xff) return codePoint; // Latin-1 range, byte-identical
  if (CODEPOINT_TO_CP1252_HIGH_BYTE.has(codePoint)) return CODEPOINT_TO_CP1252_HIGH_BYTE.get(codePoint);
  return null;
}

/**
 * Mojibake test: scans `text` for runs of characters that could *all* have
 * come from single Windows-1252 bytes, reinterprets each such run as raw
 * bytes, and checks whether those bytes are themselves valid UTF-8 that
 * decodes to something different from the run itself. If so, the run is
 * almost certainly UTF-8 that got misread as Windows-1252 and re-saved --
 * classic mojibake (e.g. "Ornek" with an O-umlaut -> the two-character
 * "A-tilde + Latin-1-supplement-glyph" sequence the report described).
 *
 * This is a heuristic over real byte reinterpretation, not a fixed list of
 * example strings, so it generalizes to any Turkish letter or punctuation
 * mark that suffers the same round-trip, not just the specific examples
 * seen so far.
 */
function detectMojibake(text) {
  const hits = [];
  let runStart = -1;
  let runBytes = [];

  function flushRun(endIndex) {
    if (runStart === -1 || runBytes.length < 2) {
      runStart = -1;
      runBytes = [];
      return;
    }
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(runBytes));
      const original = text.slice(runStart, endIndex);
      // Only a hit if re-decoding actually produced different, non-empty text --
      // otherwise this run was already plain Latin-1/Turkish text with no
      // hidden UTF-8 inside it.
      if (decoded && decoded !== original && /\p{L}/u.test(decoded)) {
        hits.push({ original, decoded });
      }
    } catch {
      // Not valid UTF-8 when reinterpreted -- not mojibake, just ordinary
      // extended-Latin text (e.g. real Turkish characters typed directly).
    }
    runStart = -1;
    runBytes = [];
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const byte = charToWindows1252Byte(char);
    if (byte !== null && byte >= 0x80) {
      if (runStart === -1) runStart = i;
      runBytes.push(byte);
    } else {
      flushRun(i);
    }
  }
  flushRun(text.length);

  return hits;
}

/**
 * Validates one already-parsed JSON value against the canonical v1 shape.
 * Returns { errors: string[], warnings: string[], info: string[], ids: string[] }.
 * Does not check global (cross-file) id uniqueness -- that's the caller's job.
 */
function validateDocument(doc) {
  const errors = [];
  const warnings = [];
  const info = [];
  const ids = [];

  if (Array.isArray(doc)) {
    errors.push(
      'LEGACY FORMAT DETECTED: this file is a bare JSON array (legacy GK-001 shape: ' +
        'options/correct_answer/tymm_skill/rationale). It is not importable as canonical v1. ' +
        'Convert it first (planned future legacy converter) or rewrite it in v1 shape. ' +
        'See docs/content/QUESTION_JSON_FORMAT.md.'
    );
    return { errors, warnings, info, ids };
  }

  if (!isPlainObject(doc)) {
    errors.push('Top level must be a JSON object, got ' + typeof doc);
    return { errors, warnings, info, ids };
  }

  const missingTopLevel = REQUIRED_TOP_LEVEL_FIELDS.filter((f) => !(f in doc));
  if (missingTopLevel.length > 0) {
    errors.push(`Missing required top-level field(s): ${missingTopLevel.join(', ')}`);
  }

  if ('package' in doc && (typeof doc.package !== 'string' || doc.package.trim().length === 0)) {
    errors.push(`"package" must be a non-empty string, got ${JSON.stringify(doc.package)}`);
  }

  if ('type' in doc) {
    if (typeof doc.type !== 'string' || doc.type.trim().length === 0) {
      errors.push(`"type" must be a non-empty string, got ${JSON.stringify(doc.type)}`);
    } else if (!VALID_TOP_LEVEL_TYPES.includes(doc.type)) {
      errors.push(`Unrecognized "type": ${JSON.stringify(doc.type)} (must be one of ${VALID_TOP_LEVEL_TYPES.join('/')})`);
    }
  }

  const isTopicPack = doc.type === 'topic_pack';
  const isMockExam = doc.type === 'mock_exam';

  if (isTopicPack) {
    if (!('topic' in doc)) {
      errors.push('Missing required top-level field(s): topic (required when "type" is "topic_pack")');
    } else if (typeof doc.topic !== 'string' || doc.topic.trim().length === 0) {
      errors.push(`"topic" must be a non-empty string, got ${JSON.stringify(doc.topic)}`);
    }
  } else if ('topic' in doc && (typeof doc.topic !== 'string' || doc.topic.trim().length === 0)) {
    // Top-level "topic" is optional for mock_exam (and for an unrecognized
    // type, which already errors above), but if present it must still be
    // well-formed -- no silently-accepted garbage.
    errors.push(`"topic" must be a non-empty string, got ${JSON.stringify(doc.topic)}`);
  }

  if ('status' in doc) {
    if (!VALID_STATUSES.includes(doc.status)) {
      errors.push(`Invalid "status": ${JSON.stringify(doc.status)} (must be one of ${VALID_STATUSES.join('/')})`);
    }
  } else {
    info.push('No "status" field present -- will be treated as DRAFT.');
  }

  const questions = Array.isArray(doc.questions) ? doc.questions : null;
  if (questions === null) {
    errors.push('"questions" must be an array');
    return { errors, warnings, info, ids };
  }

  if (!Number.isInteger(doc.question_count) || doc.question_count <= 0) {
    errors.push(`"question_count" must be a positive integer, got ${JSON.stringify(doc.question_count)}`);
  } else if (doc.question_count !== questions.length) {
    errors.push(`"question_count" (${doc.question_count}) does not match questions.length (${questions.length})`);
  }

  questions.forEach((q, index) => {
    const label = isPlainObject(q) && typeof q.id === 'string' ? q.id : `index ${index}`;

    if (!isPlainObject(q)) {
      errors.push(`question[${index}]: must be an object`);
      return;
    }

    const missingFields = REQUIRED_QUESTION_FIELDS.filter((f) => !(f in q));
    if (missingFields.length > 0) {
      errors.push(`question[${index}] (${label}): missing required field(s): ${missingFields.join(', ')}`);
    }

    if (typeof q.id === 'string' && q.id.trim().length > 0) {
      if (q.id !== q.id.trim()) {
        errors.push(`question[${index}] (${label}): "id" must not have leading or trailing whitespace`);
      }
      ids.push(q.id);
    } else {
      errors.push(`question[${index}]: "id" must be a non-empty string`);
    }

    if (isTopicPack) {
      if ('topic' in q && q.topic !== doc.topic) {
        errors.push(
          `question[${index}] (${label}): question.topic (${JSON.stringify(q.topic)}) does not match ` +
            `top-level topic (${JSON.stringify(doc.topic)})`
        );
      }
    } else if (isMockExam) {
      if ('topic' in q && (typeof q.topic !== 'string' || q.topic.trim().length === 0)) {
        errors.push(`question[${index}] (${label}): "topic" must be a non-empty string`);
      }
    }

    if ('choices' in q) {
      if (!isPlainObject(q.choices)) {
        errors.push(`question[${index}] (${label}): "choices" must be an object`);
      } else {
        const choiceKeys = Object.keys(q.choices).sort();
        const expected = [...CHOICE_LABELS].sort();
        const sameKeys =
          choiceKeys.length === expected.length && choiceKeys.every((k, i) => k === expected[i]);
        if (!sameKeys) {
          errors.push(
            `question[${index}] (${label}): "choices" must have exactly keys A,B,C,D,E, got ${choiceKeys.join(',') || '(none)'}`
          );
        } else {
          for (const key of CHOICE_LABELS) {
            if (typeof q.choices[key] !== 'string' || q.choices[key].trim().length === 0) {
              errors.push(`question[${index}] (${label}): choices.${key} must be a non-empty string`);
            }
          }
        }
      }
    }

    if ('answer' in q) {
      if (typeof q.answer !== 'string' || !CHOICE_LABELS.includes(q.answer)) {
        errors.push(`question[${index}] (${label}): "answer" must be one of A-E, got ${JSON.stringify(q.answer)}`);
      } else if (isPlainObject(q.choices) && !(q.answer in q.choices)) {
        errors.push(`question[${index}] (${label}): "answer" (${q.answer}) is not a key present in "choices"`);
      }
    }

    if ('negative_stem' in q && typeof q.negative_stem !== 'boolean') {
      errors.push(`question[${index}] (${label}): "negative_stem" must be a boolean`);
    }

    if ('difficulty' in q) {
      if (!Number.isInteger(q.difficulty) || q.difficulty <= 0) {
        errors.push(`question[${index}] (${label}): "difficulty" must be a positive integer, got ${JSON.stringify(q.difficulty)}`);
      }
    }

    if ('quality_score' in q) {
      if (!Number.isInteger(q.quality_score) || q.quality_score < 0 || q.quality_score > 100) {
        errors.push(
          `question[${index}] (${label}): "quality_score" must be an integer 0-100, got ${JSON.stringify(q.quality_score)}`
        );
      }
    }

    if ('quality_filters' in q && !isPlainObject(q.quality_filters)) {
      errors.push(`question[${index}] (${label}): "quality_filters" must be an object`);
    }

    for (const stringField of ['subtopic', 'learning_outcome', 'question', 'explanation', 'bloom_level', 'question_type']) {
      if (stringField in q && (typeof q[stringField] !== 'string' || q[stringField].trim().length === 0)) {
        errors.push(`question[${index}] (${label}): "${stringField}" must be a non-empty string`);
      }
    }
  });

  return { errors, warnings, info, ids };
}

function validateFile(path, globalIds) {
  const result = { path, errors: [], warnings: [], info: [] };

  let text;
  try {
    text = readStrictUtf8(path);
  } catch (err) {
    result.errors.push(`File is not valid UTF-8: ${err.message}`);
    return result;
  }

  const mojibakeHits = detectMojibake(text);
  if (mojibakeHits.length > 0) {
    const examples = mojibakeHits.slice(0, 3).map((h) => `"${h.original}" (looks like it should be "${h.decoded}")`);
    result.warnings.push(
      `Possible mojibake (mis-encoded text) detected -- please eyeball the Turkish characters. Examples: ${examples.join('; ')}`
    );
  }

  let doc;
  try {
    doc = JSON.parse(text);
  } catch (err) {
    result.errors.push(`Invalid JSON: ${err.message}`);
    return result;
  }

  const { errors, warnings, info, ids } = validateDocument(doc);
  result.errors.push(...errors);
  result.warnings.push(...warnings);
  result.info.push(...info);

  for (const id of ids) {
    if (globalIds.has(id)) {
      result.errors.push(`Duplicate question id "${id}" -- already seen in ${globalIds.get(id)}`);
    } else {
      globalIds.set(id, path);
    }
  }

  return result;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node validate-question-json.mjs <file-or-directory> [...more]');
    process.exit(2);
  }

  const files = findJsonFiles(args);
  if (files.length === 0) {
    console.error('No .json files found for the given path(s).');
    process.exit(2);
  }

  console.log(`Validating ${files.length} file(s)...\n`);

  const globalIds = new Map();
  const results = files.map((f) => validateFile(f, globalIds));

  let passed = 0;
  let failed = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const hasErrors = result.errors.length > 0;
    if (hasErrors) {
      failed++;
      console.log(`[FAIL] ${result.path}`);
    } else {
      passed++;
      console.log(`[PASS] ${result.path}`);
    }
    for (const info of result.info) console.log(`  (info) ${info}`);
    for (const warning of result.warnings) {
      totalWarnings++;
      console.log(`  (warn) ${warning}`);
    }
    for (const error of result.errors) console.log(`  - ${error}`);
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${totalWarnings} warning(s) -- ${files.length} file(s) total.`);

  const overallOk = failed === 0;
  console.log(overallOk ? 'PASS' : 'FAIL');
  process.exit(overallOk ? 0 : 1);
}

main();
