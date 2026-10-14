// Contract test for the manual test bench. Copy it into the project, point BENCH at the bench,
// adapt STORY_REF to the project's story ids, and run it with the project's tests:
//
//   BENCH=docs/bench.json node --test bench-contract.test.mjs
//
// Why it exists: a syntax error in a bench page silently hid every case after it — the page
// rendered the cases before the error and nothing else, and nobody noticed until a test parsed
// the whole thing. A bench is data a certification cites by id; treat it like code.
//
// The bench may be a JSON file shaped like bench-case.schema.json, or an HTML page that keeps
// it in one <script type="application/json" id="bench"> block (and renders it with a separate
// script). Keep the data out of executable code: a JSON block either parses whole or fails loud.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BENCH = process.env.BENCH ?? 'docs/bench.json';
// What a case's `story` must cite. Adapt: feature-story-scenario ids, debt items, quick reviews.
const STORY_REF = /^F\d{3}-US\d+-\d+( · F\d{3}-US\d+-\d+)*$/;

function load() {
  const raw = readFileSync(BENCH, 'utf8');
  if (!BENCH.endsWith('.html')) return JSON.parse(raw);
  const blocks = [...raw.matchAll(/<script type="application\/json" id="bench">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'the bench page keeps its data in exactly one JSON block');
  return JSON.parse(blocks[0][1]);
}

test('the bench parses whole', () => {
  assert.doesNotThrow(load);
});

test('it has groups and cases', () => {
  const { groups, cases } = load();
  assert.ok(Array.isArray(groups) && groups.length > 0);
  assert.ok(Array.isArray(cases) && cases.length > 0);
});

test('case ids and group ids are unique', () => {
  const { groups, cases } = load();
  const dup = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dup(cases.map((c) => c.id)), []);
  assert.deepEqual(dup(groups.map((g) => g.id)), []);
});

test('every case belongs to an existing group', () => {
  const { groups, cases } = load();
  const ids = new Set(groups.map((g) => g.id));
  assert.deepEqual(cases.filter((c) => !ids.has(c.group)).map((c) => c.id), []);
});

test('every case has the required fields, non-empty', () => {
  const { cases } = load();
  const filled = (v) => typeof v === 'string' && v.trim() !== '';
  const bad = cases.filter((c) => {
    const text = ['id', 'group', 'actor', 'story', 'title', 'expected'].every((k) => filled(c[k]));
    const steps = Array.isArray(c.steps) && c.steps.length > 0 && c.steps.every(filled);
    const optional = ['ref', 'note'].every((k) => c[k] === undefined || filled(c[k]));
    return !(text && steps && optional);
  });
  assert.deepEqual(bad.map((c) => c.id), []);
});

test('every case cites the story and scenario it proves', () => {
  const { cases } = load();
  assert.deepEqual(cases.filter((c) => !STORY_REF.test(c.story)).map((c) => c.id), []);
});
