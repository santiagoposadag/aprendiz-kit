# Common walker brief · whole-product certification

Every walker reads this first, then its own brief (`walker-brief.md`). Placeholders in
`<angle brackets>` are filled once per certification round by the orchestrator. Each section
is here because a round without it produced a bad walk.

## What this is

Certify the product **as it stands** at commit `<short hash>`, the way a manual QA would: use
it as several users, take screenshots, and check each action **on another user's screen**
whenever it has one (the moderator approves → the buyer sees the record). The result feeds a
visual report for `<who reads it>`: little text, screenshots that explain themselves.

You fix nothing — not the code, not the bench. A failure is a defect: you document it.

## Source of the cases

- The bench: `<path to the bench>`. Read its preparation notes too.
- The authority when the bench and the spec disagree: `<path to specs>`. A wording difference
  that is coherent with the spec is a note, not a FAIL. A bench case that contradicts the
  spec is a bench defect: log it, citing the spec line.
- Test accounts: `<path to the seed and its account list>`. Never real accounts or real data.

## Your stack, yours alone

1. Work only in your own checkout: `<worktree path pattern>`, detached at `<short hash>`.
2. Bring up your own stack and seed it: `<stack up command>`, then `<seed command>`. Save the
   seed's summary to `<scratch path>/seed.txt`. Read your hosts from `<where the stack writes them>`.
3. When done, tear it down: `<stack down command, with volumes>`. A walk is not read-only —
   it approves, pauses, sells — so nobody else may ever reuse your stack.

## Driving the browser (important)

Other walkers run **at the same time** on other stacks. A browser MCP may be shared between
agents, and cookies on `localhost` ignore the port, so one walker's login overwrites
another's. **Do not use a shared browser MCP.** Drive the browser from your own scripts under
`<scratch path>`, with `<playwright package>`, and **one `browser.newContext()` per user**.
Isolated contexts are also what make cross-user checks real: two sessions, two people.

- **Walk as a person.** Enter from where a person lands — the home page, the menu — and click
  to the screen. Type a URL only when the case is about a link (a shared link, an unknown
  route, an API probe).
- **API probes use the page's own session**: `page.evaluate(() => fetch(...))` from that
  user's page. A detached request context returned 401 where the same call from the page
  returned 200. Evidence an API check with a simple page showing status and trimmed body
  (`page.setContent` with a `<pre>`), under the same strip.

## Screenshots

- Desktop viewport `<1280×900>`. Phone `<390×844, isMobile, hasTouch, deviceScaleFactor 2>`
  where the case mentions a phone, and at least once per journey a person would walk on one.
- Viewport, not full page — unless what you prove is below the fold. Then scroll it into
  frame or take a second shot.
- **The evidence strip.** Before each capture, inject a fixed strip at the top of the page
  (background `<strip colour, default #1F2937>`, white text, 13 px, one or two lines) saying
  **who** is looking and **what was read** at that instant, with real values from the DOM or
  the API: `Member A · Tools filtered by Garden: 5 tools`. Never write in the strip anything
  you did not read.
- **The strip is a caption, not evidence.** The claim must be visible on the page beneath
  it. Auditors mark PARTIAL every check whose decisive value lives only in the strip or below
  the fold.
- **Never edit a screenshot after capture. Retake it.** One strip once printed `undefined`
  and was repainted afterwards; it survived only because the auditor confirmed every figure
  on the page beneath.
- A cross-user claim needs the second user's screen; a counter needs it before **and** after
  (`a`, `b`).
- Name: `<report dir>/<Jnn>/<nn><letter>-<slug>-<desktop|phone>.png`, short ASCII slug.

## Verdicts (exact tokens in the JSON)

- **PASS** — you saw it and the screenshot shows it.
- **PARTIAL** — only part holds, or it was proved in a reduced form: an equivalent seeded
  fixture, an emulated device. Name the substitution in the note. PARTIAL exists because a
  real share of checks are proved this way, and forcing PASS or FAIL lies either way.
- **FAIL** — the screen contradicts the expected result, or a request fails behind a cheerful
  screen.
- **UNVERIFIABLE** — the moment could not be reached. Name the exact blocker: missing
  fixture, open decision, hardware.

A check with one guessed row is worth nothing. An honest UNVERIFIABLE is worth more than a
guessed PASS.

## Method (one or more per check)

- `screen` — seen by the same user who acted.
- `cross` — the effect checked on **another** user's screen (the note names who acted and who saw).
- `api` — HTTP status and body read directly.
- `seed` — seeded data, read as is.

## State across journeys

A case that depends on data another journey creates is either yours too (the orchestrator
assigned it to you for that reason) or walked on a seeded equivalent and marked PARTIAL with
the substitution named. Walk read-only seed cases first, then the ones that consume state.

## Deliverable (your file set)

You write only under `<report dir>/` (your `Jnn/` folders) and `<scratch path>/`, plus
`<report dir>/checks-<walker>.json`, shaped exactly as `checks.schema.json` in the
certification skill. In short:

```json
{
  "walker": "w1", "commit": "<short hash>", "date": "YYYY-MM-DD",
  "journeys": [{ "id": "J01", "title": "…", "checks": [{
    "id": "J01.1", "title": "≤ 12 words", "users": ["member A"], "method": ["screen"],
    "verdict": "PASS", "cases": ["B-01"],
    "screenshots": [{ "file": "J01/01a-slug-desktop.png", "caption": "≤ 10 words" }],
    "note": "≤ 25 words, only if it adds something"
  }]}],
  "defects": [{ "id": "w1-D1", "severity": "high|medium|low", "title": "", "steps": "",
    "expected": "", "actual": "", "screenshot": "J01/…" }],
  "consumedState": "", "consoleNetwork": "", "unverifiable": ""
}
```

- A check groups one or more bench cases that prove the same idea. Every case assigned to you
  appears in some `cases`.
- Every cited file exists. Validate the JSON and the paths before reporting.
- Defects are logged, never fixed: severity, steps, expected, actual, one screenshot.

## Report

Final message to the orchestrator with `SendMessage`: count per verdict, each FAIL with its
route and step, each UNVERIFIABLE with its blocker, defects, consumed state, stack torn down,
and the path of the JSON.
