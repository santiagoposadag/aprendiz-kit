#!/usr/bin/env node
// Checks what the kit depends on and says what is missing, how much it matters and the
// command that fixes it. Deterministic: it reads versions, paths and the Claude CLI's own
// listings, and asks no model anything.
//
//   node doctor.mjs [--json]
//
// Levels: critical (an agent cannot do its main job without it), recommended (the kit
// works, and loses something it was designed around), optional (only one workflow needs
// it). Exit code 1 when a critical check fails, 0 otherwise.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const asJson = process.argv.includes('--json');
const win = process.platform === 'win32';
const mac = process.platform === 'darwin';

// ---------- helpers ----------
function which(cmd) {
  const exts = win ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      const p = path.join(dir, cmd + ext);
      try {
        if (fs.statSync(p).isFile()) return p;
      } catch {}
    }
  }
  return null;
}
function run(cmd, args, timeout = 30000) {
  const exe = which(cmd);
  if (!exe) return { ok: false, out: '', missing: true };
  // .cmd and .bat shims need a shell on Windows; quote every argument for it.
  const shell = win && /\.(cmd|bat)$/i.test(exe);
  const r = spawnSync(shell ? `"${exe}"` : exe, shell ? args.map((a) => `"${a}"`) : args, {
    encoding: 'utf8',
    timeout,
    shell,
    windowsHide: true,
  });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim(), missing: false };
}
function resolveFrom(mod) {
  for (const base of [process.cwd(), process.env.REPORT_DEPS_DIR].filter(Boolean)) {
    try {
      return createRequire(path.join(path.resolve(base), 'noop.js')).resolve(mod);
    } catch {}
  }
  return null;
}
const parseJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const results = [];
const add = (level, area, name, ok, detail, fix = '') => results.push({ level, area, name, ok, detail, fix: ok ? '' : fix });

// ---------- Claude Code ----------
const claude = run('claude', ['--version']);
add('critical', 'Claude Code', 'claude CLI on PATH', claude.ok, claude.ok ? claude.out.split('\n')[0] : 'not found', 'Install Claude Code: https://code.claude.com');

const plugins = claude.ok ? parseJson(run('claude', ['plugin', 'list', '--json']).out) ?? [] : [];
const findPlugin = (name) => plugins.find((p) => p.id?.split('@')[0] === name);

// ---------- Playwright MCP (bundled by the kit's .mcp.json) ----------
const nodeMajor = Number(process.versions.node.split('.')[0]);
add('critical', 'Playwright', 'Node.js 18 or later', nodeMajor >= 18, `node ${process.versions.node}`, 'Install Node.js 18+ (https://nodejs.org)');
const npx = which('npx');
add('critical', 'Playwright', 'npx on PATH (starts the bundled Playwright MCP)', !!npx, npx ?? 'not found', 'Install Node.js with npm; npx ships with it');

// @playwright/mcp drives the installed Google Chrome by default.
const chromePaths = win
  ? [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]
      .filter(Boolean)
      .map((d) => path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe'))
  : mac
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')]
    : ['/opt/google/chrome/chrome', which('google-chrome'), which('google-chrome-stable')].filter(Boolean);
const chrome = chromePaths.find((p) => fs.existsSync(p));
add('critical', 'Playwright', 'Google Chrome installed (the browser Playwright MCP drives)', !!chrome, chrome ?? 'not found in the standard locations', 'npx playwright install chrome');

// The kit's server is declared in plugin.json and only runs while the plugin is enabled.
const kit = findPlugin('aprendiz-kit');
add(
  'critical',
  'Playwright',
  'aprendiz-kit plugin enabled (it starts the bundled Playwright MCP)',
  !!kit?.enabled || !!process.env.CLAUDE_PLUGIN_ROOT,
  kit ? `${kit.id} ${kit.version ?? ''}${kit.enabled ? '' : ' (disabled)'}` : 'not in `claude plugin list` — fine only if you load it with --plugin-dir',
  kit ? `claude plugin enable ${kit.id}` : 'claude plugin marketplace add santiagoposadag/aprendiz-kit && claude plugin install aprendiz-kit@aprendiz-kit',
);

// A "playwright" server of the user's own is accepted by the agents too, but two browser
// servers in one session invite the wrong one being driven.
const own = claude.ok ? run('claude', ['mcp', 'get', 'playwright']) : { ok: false, out: '' };
const ownScope = own.ok ? own.out.match(/Scope:\s*(.*)$/m)?.[1]?.trim() : null;
add(
  'optional',
  'Playwright',
  'No second Playwright MCP besides the kit\'s',
  !ownScope,
  ownScope ? `another "playwright" server is configured (${ownScope})` : 'none',
  'claude mcp remove playwright   (keep it if something else needs it; the agents accept either)',
);

// ---------- Engram ----------
const engramBin = which('engram');
const engramVer = engramBin ? run('engram', ['version']) : { ok: false, out: '' };
add(
  'recommended',
  'Engram',
  'engram binary on PATH',
  !!engramBin && engramVer.ok,
  engramBin ? engramVer.out.split('\n')[0] || engramBin : 'not found',
  mac || process.platform === 'linux'
    ? 'brew install gentleman-programming/tap/engram'
    : 'go install github.com/Gentleman-Programming/engram/cmd/engram@latest   (or a release binary: https://github.com/Gentleman-Programming/engram/releases)',
);

const engramPlugin = findPlugin('engram');
add(
  'recommended',
  'Engram',
  'engram plugin installed and enabled (hooks, session tracking, compaction recovery)',
  !!engramPlugin?.enabled,
  engramPlugin ? `${engramPlugin.id} ${engramPlugin.version ?? ''}${engramPlugin.enabled ? '' : ' (disabled)'}` : 'not installed',
  engramPlugin ? `claude plugin enable ${engramPlugin.id}` : 'claude plugin marketplace add Gentleman-Programming/engram && claude plugin install engram',
);

const engramMcp = claude.ok ? run('claude', ['mcp', 'get', 'engram']) : { ok: false, out: '' };
const engramConnected = engramMcp.ok && /connected/i.test(engramMcp.out) && !/failed|not connected/i.test(engramMcp.out);
add(
  'recommended',
  'Engram',
  'engram MCP server registered and connected (the memory tools agents call)',
  engramConnected,
  engramMcp.ok ? (engramMcp.out.match(/Status:.*$/m)?.[0] ?? 'registered') : 'no MCP server named "engram"',
  'engram setup claude-code   (the plugin alone does not register the MCP server)',
);

for (const tool of ['jq', 'curl']) {
  const p = which(tool) ?? (win && tool === 'curl' ? which('curl.exe') : null);
  add('recommended', 'Engram', `${tool} on PATH (the engram plugin's hooks need it)`, !!p, p ?? 'not found', win ? `winget install ${tool === 'jq' ? 'jqlang.jq' : 'cURL.cURL'}` : mac ? `brew install ${tool}` : `install ${tool} with your package manager`);
}

if (engramBin) {
  const doc = run('engram', ['doctor', '--json'], 60000);
  const parsed = parseJson(doc.out);
  const status = parsed?.status ?? parsed?.summary?.status ?? (doc.ok ? 'ok' : 'failed');
  add('recommended', 'Engram', "engram's own diagnostics (engram doctor)", doc.ok && /^ok$/i.test(String(status)), `status: ${status}`, 'engram doctor   (read its "next:" lines)');
}

// ---------- Certification (only whole-product rounds and the report) ----------
const pw = resolveFrom('playwright') ?? resolveFrom('@playwright/test');
add(
  'optional',
  'Certification',
  'playwright or @playwright/test resolvable (parallel walkers, check-report.mjs)',
  !!pw,
  pw ? path.dirname(pw) : 'not found from this directory or $REPORT_DEPS_DIR',
  'npm i -D @playwright/test && npx playwright install chromium   (in the project being certified)',
);
const sharp = resolveFrom('sharp');
add('optional', 'Certification', 'sharp resolvable (build-report.mjs --mode publish)', !!sharp, sharp ? path.dirname(sharp) : 'not found from this directory or $REPORT_DEPS_DIR', 'npm i -D sharp   (in the project being certified)');

// ---------- report ----------
const LEVELS = ['critical', 'recommended', 'optional'];
const failed = (lvl) => results.filter((r) => r.level === lvl && !r.ok);
const summary = Object.fromEntries(LEVELS.map((l) => [l, { failed: failed(l).length, total: results.filter((r) => r.level === l).length }]));

if (asJson) {
  console.log(JSON.stringify({ ok: summary.critical.failed === 0, summary, results }, null, 2));
} else {
  const mark = (r) => (r.ok ? 'ok  ' : r.level === 'critical' ? 'FAIL' : r.level === 'recommended' ? 'WARN' : 'info');
  for (const lvl of LEVELS) {
    console.log(`\n${lvl.toUpperCase()}`);
    for (const r of results.filter((x) => x.level === lvl)) {
      console.log(`  [${mark(r)}] ${r.area}: ${r.name}\n         ${r.detail}`);
      if (r.fix) console.log(`         fix: ${r.fix}`);
    }
  }
  const line = LEVELS.map((l) => `${l} ${summary[l].total - summary[l].failed}/${summary[l].total}`).join(' · ');
  console.log(`\n${summary.critical.failed ? 'NOT READY' : 'READY'} — ${line}`);
  if (summary.critical.failed) console.log('A critical check failed: the browser agents cannot walk until it is fixed.');
}
process.exit(summary.critical.failed ? 1 : 0);
