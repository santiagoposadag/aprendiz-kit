#!/usr/bin/env node
// Builds one certification report page from every walker's checks-*.json, the matching
// audit-*.json and the screenshots they cite.
//
//   node build-report.mjs --out <dir> [--mode repo|publish] [--config <file>] <srcDir...>
//
// repo     <out>/report.html, pointing at the PNGs where they already are (relative paths).
// publish  <out>/index.html, WebP copies under <out>/img/ and <out>/published-files.json.
//          Needs `sharp` resolvable from the current directory or from $REPORT_DEPS_DIR.
//
// Exit codes: 1 usage, 2 a cited screenshot is missing, 3 a file breaks the contract
// (see ../checks.schema.json and ../audit.schema.json). Orphan screenshots are warned about,
// not fatal: closing gaps from them is the orchestrator's call, after opening each one.
//
// After building, run check-report.mjs on the page. The first report this generator descends
// from opened the wrong image on every click and looked perfect doing it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// ---------- arguments ----------
const args = process.argv.slice(2);
const opt = { mode: 'repo', out: null, config: null, src: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') opt.out = args[++i];
  else if (a === '--mode') opt.mode = args[++i];
  else if (a === '--config') opt.config = args[++i];
  else opt.src.push(a);
}
if (!opt.out || !['repo', 'publish'].includes(opt.mode) || opt.src.length === 0) {
  console.error('usage: node build-report.mjs --out <dir> [--mode repo|publish] [--config <file>] <srcDir...>');
  process.exit(1);
}

// ---------- contract ----------
// Canonical tokens live in the JSON; what a reader sees comes from strings.verdicts.
const VERDICTS = ['PASS', 'PARTIAL', 'FAIL', 'UNVERIFIABLE'];
const VCLASS = { PASS: 'ok', PARTIAL: 'warn', FAIL: 'bad', UNVERIFIABLE: 'nv' };
const METHODS = ['screen', 'cross', 'api', 'seed'];
const SEVERITIES = ['high', 'medium', 'low'];
const SEVCLASS = { high: 'bad', medium: 'warn', low: 'nv' };
const SUPPORT = ['SUPPORTED', 'PARTIAL', 'UNSUPPORTED'];

// ---------- configuration: neutral defaults, every string and colour overridable ----------
const DEFAULTS = {
  lang: 'en',
  title: 'Certification report',
  heading: 'The product, as it stands',
  eyebrow: 'Product certification · manual QA with evidence',
  lede: 'Every row is something the product promises, walked in a real browser by test users. Each screenshot carries a strip naming who is looking and what was read at that instant.',
  environment: '',
  benchSize: null,
  journeys: {},
  limits: [],
  strings: {
    verdicts: { PASS: 'Pass', PARTIAL: 'Partial', FAIL: 'Fail', UNVERIFIABLE: 'Unverifiable' },
    methods: {
      screen: ['Screen', 'Seen by the same user who acted'],
      cross: ['Cross', "Effect checked on another user's screen"],
      api: ['API', 'HTTP status and body read directly'],
      seed: ['Seed', 'Seeded data, read as is'],
    },
    severity: { high: 'High severity', medium: 'Medium severity', low: 'Low severity' },
    facts: { commit: 'Commit', date: 'Date', environment: 'Environment', coverage: 'Coverage', audit: 'Audit' },
    coverage: '{checks} checks · {cases} bench cases{ofTotal} · {shots} screenshots',
    ofTotal: ' of {total}',
    auditFact: '{supported} of {checks} with the evidence supported by an independent auditor',
    filterLabel: 'Filter by verdict',
    filterHint: 'Press a total to see only those checks; press it again to see them all.',
    journeysLabel: 'Journeys',
    auditPending: 'Audit pending',
    auditSupported: 'Evidence audited: it supports the verdict',
    auditPrefix: 'Audit: {support}.',
    support: { SUPPORTED: 'supported', PARTIAL: 'partly supported', UNSUPPORTED: 'unsupported' },
    completedBy: 'Completed by the orchestrator.',
    defectsEyebrow: 'Findings',
    defectsTitle: 'Defects found',
    defectsLede: '{n} defect(s), most severe first. None was fixed during certification.',
    defectsNav: 'Defects found',
    steps: 'Steps',
    expected: 'Expected',
    actual: 'Actual',
    defectShot: 'Defect',
    limitsEyebrow: 'Scope',
    limitsTitle: 'What this method does not cover',
    limitsMissing: 'No limits were declared. A report that claims to cover everything is not believable; ask for this list before reading the rest.',
    notesEyebrow: 'For auditors',
    notesTitle: 'Consumed state, console and network',
    enlarge: 'Enlarge: {caption}',
    viewer: 'Enlarged screenshot',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
  },
  palette: {
    light: {
      paper: '#F7F7F5', surface: '#FFFFFF', ink: '#1B1D21', muted: '#5F6670', line: '#DEE1E6',
      accent: '#2F5BD3', accentInk: '#2448A8',
      ok: '#177245', okBg: '#E2F3EA', warn: '#8A5A00', warnBg: '#FCF1DC', bad: '#B3261E', badBg: '#FCE8E6', nv: '#59616B', nvBg: '#E9EBEE',
    },
    dark: {
      paper: '#121417', surface: '#1B1E23', ink: '#ECEEF1', muted: '#A2A9B3', line: '#2E333A',
      accent: '#7FA2FF', accentInk: '#9DB8FF',
      ok: '#74D3A0', okBg: '#15301F', warn: '#F0C066', warnBg: '#352910', bad: '#FF8C84', badBg: '#3F1E1B', nv: '#B0B7C1', nvBg: '#2A2E34',
    },
  },
  // No external request by default. Set `stylesheet` to a font CSS URL to load one; the
  // stacks below stay as fallbacks either way.
  fonts: {
    stylesheet: null,
    display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    mono: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
  },
};
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const merge = (base, over) => {
  if (!isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(base?.[k]) ? merge(base[k], v) : v;
  return out;
};
const cfg = merge(DEFAULTS, opt.config ? JSON.parse(fs.readFileSync(opt.config, 'utf8')) : {});
const S = cfg.strings;
const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- read and validate every walker's files ----------
const problems = [];
const need = (cond, where, msg) => { if (!cond) problems.push(`${where}: ${msg}`); };
const isStr = (v) => typeof v === 'string';

// The palette and font stacks go into the page's <style> as they are, so they are held to
// what a colour or a font list can look like: nothing that closes a rule or the element.
const COLOR = /^(#[0-9a-f]{3,8}|(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\([0-9a-z.,%\s/-]*\)|[a-z]+)$/i;
const FONT_STACK = /^[^<>;{}()\\]*$/;
for (const scheme of ['light', 'dark']) {
  for (const [k, v] of Object.entries(cfg.palette?.[scheme] ?? {})) {
    need(/^[a-z][a-z0-9]*$/i.test(k), 'config', `palette.${scheme} key "${k}" is not a plain token name`);
    need(isStr(v) && COLOR.test(v.trim()), 'config', `palette.${scheme}.${k} "${v}" is not a colour`);
  }
}
for (const k of ['display', 'body', 'mono']) need(isStr(cfg.fonts?.[k]) && FONT_STACK.test(cfg.fonts[k]), 'config', `fonts.${k} must be a plain font list`);
if (cfg.fonts?.stylesheet != null) {
  let protocol = null;
  try {
    protocol = new URL(cfg.fonts.stylesheet).protocol;
  } catch {}
  need(protocol === 'https:', 'config', 'fonts.stylesheet must be an https: URL');
}

// A screenshot must be an image inside the folder of the file that cites it. The JSON comes
// from an agent that read untrusted screens; a path that climbs out of its folder would put
// whatever it names into a page meant to be shared.
const IMAGE = /\.(png|jpe?g)$/i;
const real = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
function screenshotProblem(dir, file) {
  if (!IMAGE.test(file)) return 'is not a .png or .jpg';
  const rel = path.relative(real(dir), real(path.resolve(dir, file)));
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) return 'is outside the folder of the file that cites it';
  return null;
}

function validateChecks(d, where) {
  need(isStr(d.walker) && d.walker, where, 'walker missing');
  need(Array.isArray(d.journeys), where, 'journeys must be an array');
  for (const j of d.journeys ?? []) {
    need(isStr(j.id) && j.id, where, 'a journey has no id');
    for (const c of j.checks ?? []) {
      const at = `${where} ${c.id ?? '(no id)'}`;
      need(isStr(c.id) && c.id, at, 'id missing');
      need(isStr(c.title) && c.title, at, 'title missing');
      need(VERDICTS.includes(c.verdict), at, `verdict "${c.verdict}" is not one of ${VERDICTS.join(', ')}`);
      need(Array.isArray(c.method) && c.method.length > 0, at, 'method must list at least one tag');
      for (const m of c.method ?? []) need(METHODS.includes(m), at, `method "${m}" is not one of ${METHODS.join(', ')}`);
      need(Array.isArray(c.cases) && c.cases.length > 0, at, 'cases must name at least one bench case');
      need(Array.isArray(c.screenshots), at, 'screenshots must be an array');
      if (c.verdict !== 'UNVERIFIABLE') need((c.screenshots ?? []).length > 0, at, 'a verdict other than UNVERIFIABLE needs a screenshot');
      for (const s of c.screenshots ?? []) need(isStr(s.file) && isStr(s.caption) && s.caption, at, 'each screenshot needs file and caption');
    }
  }
  for (const df of d.defects ?? []) {
    const at = `${where} ${df.id ?? '(no id)'}`;
    need(isStr(df.id) && df.id, at, 'defect id missing');
    need(SEVERITIES.includes(df.severity), at, `severity "${df.severity}" is not one of ${SEVERITIES.join(', ')}`);
    for (const k of ['title', 'steps', 'expected', 'actual']) need(isStr(df[k]) && df[k], at, `${k} missing`);
  }
}
function validateAudit(a, where) {
  for (const row of [...(a.checks ?? []), ...(a.defects ?? [])]) {
    const at = `${where} ${row.id ?? '(no id)'}`;
    need(SUPPORT.includes(row.support), at, `support "${row.support}" is not one of ${SUPPORT.join(', ')}`);
    if (row.support !== 'SUPPORTED') need(isStr(row.reason) && row.reason, at, 'a row that is not SUPPORTED needs a reason');
    need(row.completedBy === undefined || ['auditor', 'orchestrator'].includes(row.completedBy), at, 'completedBy is auditor or orchestrator');
  }
}

const journeys = new Map();
const defects = [];
const notes = [];
const commits = new Set();
const dates = new Set();
const missing = [];
const seenIds = new Map();
const cited = new Set();

for (const dir of opt.src) {
  const files = fs.readdirSync(dir).filter((f) => /^checks-.+\.json$/.test(f)).sort();
  if (files.length === 0) problems.push(`${dir}: no checks-*.json`);
  for (const f of files) {
    const where = path.join(dir, f);
    const data = JSON.parse(fs.readFileSync(where, 'utf8'));
    validateChecks(data, where);
    const audPath = path.join(dir, f.replace(/^checks-/, 'audit-'));
    const aud = fs.existsSync(audPath) ? JSON.parse(fs.readFileSync(audPath, 'utf8')) : null;
    if (aud) validateAudit(aud, audPath);
    const audBy = new Map([...(aud?.checks ?? []), ...(aud?.defects ?? [])].map((a) => [a.id, a]));
    if (data.commit) commits.add(data.commit);
    if (data.date) dates.add(data.date);
    for (const j of data.journeys ?? []) {
      for (const c of j.checks ?? []) {
        if (seenIds.has(c.id)) problems.push(`${where} ${c.id}: id already used in ${seenIds.get(c.id)}`);
        seenIds.set(c.id, where);
        c.audit = audBy.get(c.id) ?? null;
        for (const s of c.screenshots ?? []) {
          if (!isStr(s.file)) continue; // already reported by validateChecks
          const bad = screenshotProblem(dir, s.file);
          if (bad) {
            problems.push(`${where} ${c.id}: screenshot "${s.file}" ${bad}`);
            continue;
          }
          s.src = path.resolve(dir, s.file);
          cited.add(s.src);
          if (!fs.existsSync(s.src)) missing.push(`${where} ${c.id}: ${s.file}`);
        }
      }
      const prev = journeys.get(j.id);
      journeys.set(j.id, { ...j, checks: [...(prev?.checks ?? []), ...(j.checks ?? [])] });
    }
    for (const df of data.defects ?? []) {
      let src = null;
      if (df.screenshot !== undefined) {
        const bad = !isStr(df.screenshot) ? 'is not a path' : screenshotProblem(dir, df.screenshot);
        if (bad) problems.push(`${where} ${df.id}: screenshot "${df.screenshot}" ${bad}`);
        else src = path.resolve(dir, df.screenshot);
      }
      if (src) {
        cited.add(src);
        if (!fs.existsSync(src)) missing.push(`${where} ${df.id}: ${df.screenshot}`);
      }
      defects.push({ ...df, src, audit: audBy.get(df.id) ?? null });
    }
    if (data.consumedState || data.consoleNetwork || data.unverifiable)
      notes.push({ walker: data.walker, parts: [data.consumedState, data.consoleNetwork, data.unverifiable].filter(Boolean) });
  }
}
if (problems.length) {
  console.error('contract problems:\n' + problems.join('\n'));
  process.exit(3);
}
if (missing.length) {
  console.error('missing screenshots:\n' + missing.join('\n'));
  process.exit(2);
}
if (commits.size > 1) console.error(`warning: walkers certified different commits: ${[...commits].join(', ')}`);

// Orphans: images on disk that no row cites. Warned, never silently ignored.
const outAbs = path.resolve(opt.out);
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return p === path.join(outAbs, 'img') ? [] : walk(p);
    return /\.(png|jpe?g)$/i.test(e.name) ? [path.resolve(p)] : [];
  });
const orphans = opt.src.flatMap((d) => walk(d)).filter((p) => !cited.has(p));
if (orphans.length) console.error(`warning: ${orphans.length} orphan screenshot(s), cited by no row:\n` + orphans.join('\n'));

// ---------- images ----------
fs.mkdirSync(outAbs, { recursive: true });
let sharp = null;
if (opt.mode === 'publish') {
  const bases = [process.cwd(), process.env.REPORT_DEPS_DIR].filter(Boolean);
  for (const b of bases) {
    try {
      sharp = createRequire(path.join(path.resolve(b), 'noop.js'))('sharp');
      break;
    } catch {}
  }
  if (!sharp) {
    console.error('publish mode needs `sharp`: install it in the project, or point REPORT_DEPS_DIR at a directory where it resolves.');
    process.exit(1);
  }
}
const published = [];
const webpNames = new Map();
const relUrl = (p) => p.split(path.sep).map(encodeURIComponent).join('/');
async function imgRef(src) {
  if (opt.mode === 'repo') return relUrl(path.relative(outAbs, src));
  // Keep the path below its source directory; prefix the directory's index only on a clash.
  const dirIdx = opt.src.findIndex((d) => src.startsWith(path.resolve(d) + path.sep));
  let rel = path.relative(path.resolve(opt.src[dirIdx]), src).replace(/\.(png|jpe?g)$/i, '.webp');
  if (webpNames.has(rel) && webpNames.get(rel) !== src) rel = path.join(String(dirIdx), rel);
  webpNames.set(rel, src);
  const out = path.join('img', rel);
  const abs = path.join(outAbs, out);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  await sharp(src).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toFile(abs);
  published.push(out.split(path.sep).join('/'));
  return relUrl(out);
}

const order = Object.keys(cfg.journeys).filter((k) => journeys.has(k)).concat([...journeys.keys()].filter((k) => !cfg.journeys[k]).sort());
for (const id of order) for (const c of journeys.get(id).checks) for (const s of c.screenshots ?? []) s.href = await imgRef(s.src);
for (const df of defects) if (df.src) df.href = await imgRef(df.src);

// ---------- counts ----------
const all = order.flatMap((id) => journeys.get(id).checks);
const count = (list) => Object.fromEntries(VERDICTS.map((v) => [v, list.filter((c) => c.verdict === v).length]));
const total = count(all);
const nShots = all.reduce((n, c) => n + (c.screenshots?.length ?? 0), 0);
const cases = new Set(all.flatMap((c) => c.cases ?? []));
const nSupported = all.filter((c) => c.audit?.support === 'SUPPORTED').length;

// ---------- pieces ----------
const vLabel = (v) => S.verdicts[v] ?? v;
const bar = (cnt) =>
  `<span class="bar" role="img" aria-label="${esc(VERDICTS.map((v) => `${cnt[v]} ${vLabel(v)}`).join(', '))}">${VERDICTS.filter((v) => cnt[v])
    .map((v) => `<i class="${VCLASS[v]}" style="flex:${cnt[v]}"></i>`)
    .join('')}</span>`;
const pill = (v) => `<span class="pill ${VCLASS[v] ?? 'nv'}">${esc(vLabel(v))}</span>`;
const chips = (ms) =>
  (ms ?? []).map((m) => `<span class="chip m-${esc(m)}" title="${esc(S.methods[m]?.[1] ?? m)}">${esc(S.methods[m]?.[0] ?? m)}</span>`).join('');
const auditLine = (a) => {
  if (!a) return `<p class="aud pend">${esc(S.auditPending)}</p>`;
  const by = a.completedBy === 'orchestrator' ? ` ${esc(S.completedBy)}` : '';
  if (a.support === 'SUPPORTED') return `<p class="aud ok">${esc(S.auditSupported)}.${by}${a.completedBy === 'orchestrator' && a.reason ? ` ${esc(a.reason)}` : ''}</p>`;
  return `<p class="aud ${a.support === 'PARTIAL' ? 'warn' : 'bad'}">${esc(fill(S.auditPrefix, { support: S.support[a.support] ?? a.support }))} ${esc(a.reason)}${by}</p>`;
};

// Each thumbnail registers its own viewer entry as it renders, so data-i always points at the
// image that was clicked. The report this descends from built the viewer list in one order
// (journeys first) and the thumbnail indexes in another (defects first): every click opened
// the wrong image. check-report.mjs clicks every thumbnail to keep that from coming back.
const viewer = [];
const isPhone = (s) => s.device === 'phone' || /-phone\.(png|jpe?g|webp)$/i.test(s.file ?? '');
const figure = (s, ctx = {}) => {
  const i = viewer.push({ s: s.href, t: s.caption, c: ctx.c ?? '', v: ctx.v ? vLabel(ctx.v) : '' }) - 1;
  return `<figure class="shot${isPhone(s) ? ' phone' : ''}"><button type="button" class="open" data-i="${i}" aria-label="${esc(fill(S.enlarge, { caption: s.caption }))}"><img src="${esc(s.href)}" alt="${esc(s.caption)}" loading="lazy"></button><figcaption>${esc(s.caption)}</figcaption></figure>`;
};

const journeySection = (id) => {
  const j = journeys.get(id);
  const title = cfg.journeys[id]?.title ?? j.title ?? id;
  const summary = cfg.journeys[id]?.summary ?? '';
  const users = [...new Set(j.checks.flatMap((c) => c.users ?? []))];
  return `<section class="journey" id="${esc(id)}">
  <header class="j-head"><p class="eyebrow">${esc(id)}</p><h2>${esc(title)}</h2>${summary ? `<p class="que">${esc(summary)}</p>` : ''}
  <p class="users">${users.map((u) => `<span class="user">${esc(u)}</span>`).join('')}</p></header>
  ${j.checks
    .map(
      (c) => `<article class="check v-${VCLASS[c.verdict] ?? 'nv'}" data-v="${esc(c.verdict)}">
    <div class="check-text">${pill(c.verdict)}<h3>${esc(c.title)}</h3>
    <p class="meta">${chips(c.method)}<span class="cases">${(c.cases ?? []).map(esc).join(' · ')}</span></p>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}${auditLine(c.audit)}</div>
    <div class="shots">${(c.screenshots ?? []).map((s) => figure(s, { c: `${id} · ${c.title}`, v: c.verdict })).join('')}</div>
  </article>`,
    )
    .join('\n')}
</section>`;
};

// Journeys render before defects, so previous/next in the viewer follow page order.
const journeysHtml = order.map(journeySection).join('\n');
const defectsHtml = defects.length
  ? `<section class="journey" id="defects"><header class="j-head"><p class="eyebrow">${esc(S.defectsEyebrow)}</p><h2>${esc(S.defectsTitle)}</h2><p class="que">${esc(fill(S.defectsLede, { n: defects.length }))}</p></header>
  ${[...defects]
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity))
    .map(
      (d) => `<article class="check v-${SEVCLASS[d.severity] ?? 'nv'}"><div class="check-text"><span class="pill ${SEVCLASS[d.severity] ?? 'nv'}">${esc(S.severity[d.severity] ?? d.severity)}</span><h3>${esc(d.title)}</h3>
      <dl class="def"><dt>${esc(S.steps)}</dt><dd>${esc(d.steps)}</dd><dt>${esc(S.expected)}</dt><dd>${esc(d.expected)}</dd><dt>${esc(S.actual)}</dt><dd>${esc(d.actual)}</dd></dl>${auditLine(d.audit)}</div>
      <div class="shots">${d.href ? figure({ file: d.screenshot, href: d.href, caption: d.title }, { c: S.defectShot }) : ''}</div></article>`,
    )
    .join('\n')}</section>`
  : '';

const limitsHtml = `<section class="journey" id="limits"><header class="j-head"><p class="eyebrow">${esc(S.limitsEyebrow)}</p><h2>${esc(S.limitsTitle)}</h2></header>
${cfg.limits.length ? `<ul class="limits">${cfg.limits.map((l) => `<li><b>${esc(l.title)}</b> ${esc(l.text)}</li>`).join('')}</ul>` : `<p class="missing">${esc(S.limitsMissing)}</p>`}</section>`;

const notesHtml = notes.length
  ? `<section class="journey" id="notes"><header class="j-head"><p class="eyebrow">${esc(S.notesEyebrow)}</p><h2>${esc(S.notesTitle)}</h2></header>
<div class="notes">${notes.map((n) => `<p><b>${esc(n.walker)}.</b> ${n.parts.map(esc).join(' ')}</p>`).join('')}</div></section>`
  : '';

const tokens = (p) =>
  Object.entries(p)
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
    .join(';');
const fontLink = cfg.fonts.stylesheet
  ? `<link rel="preconnect" href="${esc(new URL(cfg.fonts.stylesheet).origin)}" crossorigin><link rel="stylesheet" href="${esc(cfg.fonts.stylesheet)}">`
  : '';
const coverage = fill(S.coverage, {
  checks: all.length,
  cases: cases.size,
  ofTotal: cfg.benchSize ? fill(S.ofTotal, { total: cfg.benchSize }) : '',
  shots: nShots,
});

const html = `<!doctype html>
<html lang="${esc(cfg.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cfg.title)}</title>
${fontLink}
<style>
/* A field report: the ledger first, then one band per journey; each check is text left, its screenshots right. */
:root{${tokens(cfg.palette.light)};--f-display:${cfg.fonts.display};--f-body:${cfg.fonts.body};--f-mono:${cfg.fonts.mono};color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${tokens(cfg.palette.dark)};color-scheme:dark}}
:root[data-theme="dark"]{${tokens(cfg.palette.dark)};color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 var(--f-body)}
.wrap{max-width:1180px;margin:0 auto;padding-inline:clamp(16px,4vw,40px);padding-block:32px 80px}
h1,h2,h3{font-family:var(--f-display);text-wrap:balance;margin:0}
h1{font-size:clamp(28px,5vw,44px);line-height:1.08;letter-spacing:-.01em}
h2{font-size:clamp(22px,3vw,28px);line-height:1.15}
h3{font-size:17px;line-height:1.3;font-weight:600}
.eyebrow{font:500 12px/1.3 var(--f-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);margin:0 0 8px}
.lede{color:var(--muted);max-width:62ch;margin:12px 0 0}
.facts{display:flex;flex-wrap:wrap;gap:8px 24px;margin:20px 0 0;padding:0;list-style:none;font-size:13px;color:var(--muted)}
.facts b{color:var(--ink);font-weight:600}
.facts code{font:500 12px var(--f-mono);color:var(--ink)}
.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:28px 0 0}
.tile{background:var(--surface);padding:16px 18px;display:flex;flex-direction:column;gap:4px;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer}
.tile:hover,.tile[aria-pressed="true"]{background:var(--paper)}
.tile[aria-pressed="true"]{box-shadow:inset 0 -3px 0 var(--accent)}
.tile .n{font:700 34px/1 var(--f-display);font-variant-numeric:tabular-nums}
.tile .l{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.tile.ok .n{color:var(--ok)}.tile.warn .n{color:var(--warn)}.tile.bad .n{color:var(--bad)}.tile.nv .n{color:var(--nv)}
.hint{font-size:12px;color:var(--muted);margin:8px 0 0}
.map{margin:28px 0 0;border-top:1px solid var(--line)}
.map a{display:grid;grid-template-columns:62px minmax(0,1fr) minmax(90px,200px) 56px;gap:14px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none}
.map a:hover{background:var(--surface)}
.map .id{font:500 12px var(--f-mono);color:var(--accent-ink)}
.map .t{font-weight:500;min-width:0}
.map .k{font:500 12px var(--f-mono);color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
.bar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--line);gap:2px}
.bar i{display:block}.bar .ok{background:var(--ok)}.bar .warn{background:var(--warn)}.bar .bad{background:var(--bad)}.bar .nv{background:var(--nv)}
.legend{display:flex;flex-wrap:wrap;gap:10px 18px;margin:20px 0 0;font-size:13px;color:var(--muted)}
.legend span{display:inline-flex;gap:8px;align-items:center}
.journey{margin:64px 0 0}
.j-head{border-top:3px solid var(--ink);padding-top:16px;margin-bottom:8px}
.que{color:var(--muted);margin:6px 0 0;max-width:70ch}
.users{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0}
.user{font-size:12px;padding:3px 9px;border-radius:99px;background:var(--surface);border:1px solid var(--line)}
.check{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:20px 28px;padding:22px 0 22px 16px;border-bottom:1px solid var(--line);border-left:3px solid var(--nv)}
.check.v-ok{border-left-color:var(--ok)}.check.v-warn{border-left-color:var(--warn)}.check.v-bad{border-left-color:var(--bad)}
.check-text{display:flex;flex-direction:column;gap:8px;min-width:0}
.pill{align-self:flex-start;font:600 11px/1 var(--f-body);letter-spacing:.06em;text-transform:uppercase;padding:5px 8px;border-radius:4px}
.pill.ok{color:var(--ok);background:var(--ok-bg)}.pill.warn{color:var(--warn);background:var(--warn-bg)}.pill.bad{color:var(--bad);background:var(--bad-bg)}.pill.nv{color:var(--nv);background:var(--nv-bg)}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0}
.chip{font-size:11.5px;font-weight:500;padding:2px 8px;border-radius:4px;border:1px solid var(--line);background:var(--surface)}
.chip.m-cross{border-color:var(--accent);color:var(--accent-ink)}
.cases{font:500 11.5px var(--f-mono);color:var(--muted)}
.note{margin:0;font-size:13.5px;color:var(--muted)}
.aud{margin:0;font-size:12px;display:flex;gap:6px;align-items:baseline;color:var(--muted)}
.aud::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:var(--nv);transform:translateY(-1px)}
.aud.ok::before{background:var(--ok)}.aud.warn::before{background:var(--warn)}.aud.bad::before{background:var(--bad)}
.aud.warn,.aud.bad{color:var(--ink)}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;min-width:0;align-content:start}
.shot{margin:0;display:flex;flex-direction:column;gap:6px;min-width:0}
.shot .open{padding:0;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--surface);cursor:zoom-in;display:block;aspect-ratio:16/11;width:100%}
.shot.phone .open{aspect-ratio:auto;max-height:340px}
.shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.shot.phone img{object-fit:contain;background:var(--paper)}
.shot .open:focus-visible,.tile:focus-visible,.map a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.shot figcaption{font-size:12.5px;color:var(--muted)}
.def{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;margin:4px 0 0;font-size:13.5px}
.def dt{font-weight:600}.def dd{margin:0;color:var(--muted)}
.limits{margin:12px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:8px;max-width:75ch}
.limits b{font-weight:600}
.missing{color:var(--bad);font-weight:500;max-width:70ch}
.notes{font-size:13px;color:var(--muted);display:flex;flex-direction:column;gap:10px;max-width:80ch}
.notes p{margin:0}
dialog{border:0;padding:0;background:transparent;max-width:100vw;max-height:100vh;width:100vw;height:100vh}
dialog::backdrop{background:rgba(8,9,11,.88)}
.lb{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:10px;padding:16px clamp(12px,3vw,32px);color:#ECEEF1}
.lb-top{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:13px}
.lb-top button,.lb-nav button{font:500 13px var(--f-body);background:#23272E;color:#ECEEF1;border:1px solid #3B414A;border-radius:6px;padding:8px 12px;cursor:pointer}
.lb-img{min-height:0;display:flex;align-items:center;justify-content:center}
.lb-img img{max-width:100%;max-height:100%;object-fit:contain;border-radius:4px}
.lb-nav{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px}
.lb-nav p{margin:0;text-align:center;min-width:0}
@media (max-width:760px){.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.check{grid-template-columns:minmax(0,1fr)}.map a{grid-template-columns:52px minmax(0,1fr) 44px}.map .bar{display:none}}
@media (prefers-reduced-motion:no-preference){.tile,.map a{transition:background .15s}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <p class="eyebrow">${esc(cfg.eyebrow)}</p>
  <h1>${esc(cfg.heading)}</h1>
  <p class="lede">${esc(cfg.lede)}</p>
  <ul class="facts">
    <li><b>${esc(S.facts.commit)}</b> <code>${esc([...commits].join(', '))}</code></li>
    <li><b>${esc(S.facts.date)}</b> ${esc([...dates].join(', '))}</li>
    ${cfg.environment ? `<li><b>${esc(S.facts.environment)}</b> ${esc(cfg.environment)}</li>` : ''}
    <li><b>${esc(S.facts.coverage)}</b> ${esc(coverage)}</li>
    <li><b>${esc(S.facts.audit)}</b> ${esc(fill(S.auditFact, { supported: nSupported, checks: all.length }))}</li>
  </ul>
</header>
<div class="summary" role="group" aria-label="${esc(S.filterLabel)}">
${VERDICTS.map((v) => `<button type="button" class="tile ${VCLASS[v]}" data-filter="${esc(v)}" aria-pressed="false"><span class="n">${total[v]}</span><span class="l">${esc(vLabel(v))}</span></button>`).join('')}
</div>
<p class="hint">${esc(S.filterHint)}</p>
<nav class="map" aria-label="${esc(S.journeysLabel)}">
${order
  .map((id) => {
    const j = journeys.get(id);
    const cnt = count(j.checks);
    return `<a href="#${esc(id)}"><span class="id">${esc(id)}</span><span class="t">${esc(cfg.journeys[id]?.title ?? j.title ?? id)}</span>${bar(cnt)}<span class="k">${cnt.PASS}/${j.checks.length}</span></a>`;
  })
  .join('\n')}
${defects.length ? `<a href="#defects"><span class="id">—</span><span class="t">${esc(S.defectsNav)}</span><span class="bar" style="visibility:hidden"></span><span class="k">${defects.length}</span></a>` : ''}
</nav>
<div class="legend">${METHODS.map((k) => `<span><span class="chip m-${k}">${esc(S.methods[k][0])}</span>${esc(S.methods[k][1])}</span>`).join('')}</div>
${journeysHtml}
${defectsHtml}
${limitsHtml}
${notesHtml}
</div>
<dialog id="lb" aria-label="${esc(S.viewer)}"><div class="lb">
  <div class="lb-top"><span id="lb-c"></span><button type="button" id="lb-x">${esc(S.close)}</button></div>
  <div class="lb-img"><img id="lb-i" alt=""></div>
  <div class="lb-nav"><button type="button" id="lb-p">${esc(S.prev)}</button><p id="lb-t"></p><button type="button" id="lb-n">${esc(S.next)}</button></div>
</div></dialog>
<script>
const SHOTS=${JSON.stringify(viewer).replace(/</g, '\\u003c')};
const dlg=document.getElementById('lb'),im=document.getElementById('lb-i');let cur=0;
function show(i){cur=(i+SHOTS.length)%SHOTS.length;const s=SHOTS[cur];im.src=s.s;im.alt=s.t;
document.getElementById('lb-t').textContent=s.t;document.getElementById('lb-c').textContent=s.c+(s.v?' · '+s.v:'')+' · '+(cur+1)+'/'+SHOTS.length;}
document.addEventListener('click',e=>{const b=e.target.closest('.open');if(b){show(+b.dataset.i);dlg.showModal();}});
document.getElementById('lb-x').onclick=()=>dlg.close();
document.getElementById('lb-p').onclick=()=>show(cur-1);
document.getElementById('lb-n').onclick=()=>show(cur+1);
dlg.addEventListener('click',e=>{if(e.target.classList.contains('lb-img'))dlg.close();});
document.addEventListener('keydown',e=>{if(!dlg.open)return;if(e.key==='ArrowRight')show(cur+1);if(e.key==='ArrowLeft')show(cur-1);});
const tiles=[...document.querySelectorAll('.tile')];
tiles.forEach(t=>t.addEventListener('click',()=>{const on=t.getAttribute('aria-pressed')!=='true';
tiles.forEach(x=>x.setAttribute('aria-pressed','false'));if(on)t.setAttribute('aria-pressed','true');
const f=on?t.dataset.filter:null;document.querySelectorAll('.check[data-v]').forEach(c=>{c.hidden=!!f&&c.dataset.v!==f;});}));
</script>
</body>
</html>
`;

const pageName = opt.mode === 'publish' ? 'index.html' : 'report.html';
fs.writeFileSync(path.join(outAbs, pageName), html);
if (opt.mode === 'publish') fs.writeFileSync(path.join(outAbs, 'published-files.json'), JSON.stringify(published, null, 2));
console.log(
  JSON.stringify({
    page: path.join(outAbs, pageName),
    checks: all.length,
    total,
    cases: cases.size,
    screenshots: nShots,
    defects: defects.length,
    supported: nSupported,
    orphans: orphans.length,
    images: published.length,
  }),
);
