// Contract tests for build-report.mjs, run on copies of the synthetic fixture. No dependencies:
// repo mode needs neither sharp nor a browser.
//
//   node --test skills/certification/assets/report/build-report.test.mjs
//
// The generator writes into a page meant to be shared what two kinds of input say: walkers'
// JSON, written by an agent that read untrusted screens, and the report configuration. These
// pin what it must refuse from each.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(here, 'build-report.mjs');
const FIXTURE = path.join(here, 'fixture');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'build-report-'));
process.on('exit', () => fs.rmSync(tmp, { recursive: true, force: true }));

let n = 0;
// A fresh copy of the fixture, with `edit` applied to one walker's checks file.
function fixture(file = 'checks-w1.json', edit = () => {}) {
  const dir = path.join(tmp, `case-${++n}`, 'src');
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const p = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  edit(data, dir);
  fs.writeFileSync(p, JSON.stringify(data));
  return dir;
}
function config(edit = () => {}) {
  const data = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'report.config.json'), 'utf8'));
  edit(data);
  const p = path.join(tmp, `config-${++n}.json`);
  fs.writeFileSync(p, JSON.stringify(data));
  return p;
}
function build(src, cfg = config()) {
  const out = path.join(tmp, `out-${++n}`);
  const r = spawnSync(process.execPath, [GEN, '--out', out, '--config', cfg, src], { encoding: 'utf8' });
  const page = path.join(out, 'report.html');
  return { code: r.status, stderr: r.stderr, html: fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : '' };
}
const firstShot = (d) => d.journeys[0].checks[0].screenshots[0];

test('the fixture builds', () => {
  const r = build(fixture());
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.html, /<button type="button" class="open"/);
});

test('a screenshot outside its folder is a contract violation', () => {
  const outside = path.join(tmp, 'outside.png');
  fs.copyFileSync(path.join(FIXTURE, 'J01', '01a-available-tools-desktop.png'), outside);
  for (const file of ['../../outside.png', outside]) {
    const r = build(fixture('checks-w1.json', (d) => (firstShot(d).file = file)));
    assert.equal(r.code, 3, `${file}: ${r.stderr}`);
    assert.match(r.stderr, /outside the folder/);
  }
});

test("a defect's screenshot outside its folder is a contract violation", () => {
  const r = build(fixture('checks-w2.json', (d) => (d.defects[0].screenshot = '../../outside.png')));
  assert.equal(r.code, 3, r.stderr);
});

test('a screenshot that is not an image is a contract violation, even inside the folder', () => {
  const r = build(
    fixture('checks-w1.json', (d, dir) => {
      fs.writeFileSync(path.join(dir, 'J01', 'notes.txt'), 'not an image');
      firstShot(d).file = 'J01/notes.txt';
    }),
  );
  assert.equal(r.code, 3, r.stderr);
  assert.match(r.stderr, /not a \.png or \.jpg/);
});

test('a file name that merely starts with two dots is still inside', () => {
  const r = build(
    fixture('checks-w1.json', (d, dir) => {
      fs.renameSync(path.join(dir, 'J01', '01a-available-tools-desktop.png'), path.join(dir, 'J01', '..dots.png'));
      firstShot(d).file = 'J01/..dots.png';
    }),
  );
  assert.equal(r.code, 0, r.stderr);
});

const INJECT = 'red;}</style><script>alert(1)</script>';

test('a palette value that is not a colour is refused, and no page is written', () => {
  const r = build(fixture(), config((c) => (c.palette = { light: { paper: INJECT } })));
  assert.equal(r.code, 3, r.stderr);
  assert.equal(r.html, '');
});

test('a palette key that is not a plain token name is refused', () => {
  const r = build(fixture(), config((c) => (c.palette = { dark: { 'ink;}body{x': '#fff' } })));
  assert.equal(r.code, 3, r.stderr);
});

test('a font stack that could close the rule is refused', () => {
  const r = build(fixture(), config((c) => (c.fonts = { body: INJECT })));
  assert.equal(r.code, 3, r.stderr);
});

test('a font stylesheet must be https', () => {
  for (const url of ['http://fonts.example.com/a.css', 'javascript:alert(1)', 'not a url']) {
    const r = build(fixture(), config((c) => (c.fonts = { stylesheet: url })));
    assert.equal(r.code, 3, `${url}: ${r.stderr}`);
  }
});

test('ordinary colours, font stacks and an https stylesheet are accepted', () => {
  const r = build(
    fixture(),
    config((c) => {
      c.palette = { light: { paper: '#FAFAF9', accent: 'rgb(10 20 30 / 50%)', ok: 'oklch(60% 0.1 150)', bad: 'tomato' } };
      c.fonts = { stylesheet: 'https://fonts.googleapis.com/css2?family=Inter', body: '"Inter", system-ui, sans-serif' };
    }),
  );
  assert.equal(r.code, 0, r.stderr);
  assert.doesNotMatch(r.html, /<script>alert/);
});
