# Report generator

Turns every walker's `checks-*.json`, the matching `audit-*.json` and the screenshots they
cite into one page an owner reads with the evidence side by side.

```sh
node build-report.mjs --out <dir> [--mode repo|publish] [--config report.config.json] <srcDir...>
node check-report.mjs <dir>/report.html        # or <dir>/index.html in publish mode
```

- **`repo`** (default) writes `<out>/report.html` with relative links to the PNGs where they
  already are — the copy committed next to the evidence.
- **`publish`** writes a self-contained folder: `<out>/index.html`, WebP copies under
  `<out>/img/`, and `<out>/published-files.json` listing them. It writes files locally and
  uploads nothing; hosting the folder is a separate, deliberate step.

It exits **2** when a cited screenshot is missing and **3** when a file breaks the contract
(`../checks.schema.json`, `../audit.schema.json`): an unknown verdict or method, a check with
no case, a non-UNVERIFIABLE check with no screenshot, a duplicate check id, an audit row that
is not SUPPORTED and gives no reason, a screenshot that is not a `.png`/`.jpg` inside the
folder of the file citing it, or a configuration colour, font list or font URL that is not
plainly one (they go into the page's `<style>` as written; the font URL must be `https:`). Orphan screenshots — on disk, cited by no row — are
listed on stderr; closing a gap from one is the orchestrator's call, after opening it.

## The check that ships with it

`check-report.mjs` opens the page in Chromium and clicks every thumbnail, comparing the image
the viewer opens with the one clicked, then walks the viewer forward to confirm it follows
page order. It also checks that every image loads, that each verdict filter shows what its
tile counts, that the page does not scroll sideways at 390 px in either theme, and that the
dark theme changes the page.

It exists because the report this descends from was published with a viewer that opened the
wrong image on every click — thumbnail indexes counted defects first, the viewer list counted
journeys first — and every screenshot was on disk, so nothing but clicking could show it.
Reintroducing that ordering makes the check fail on every thumbnail.

## Dependencies

None bundled. `publish` needs `sharp`; the check needs `playwright` or `@playwright/test`
with Chromium. Both are resolved from the current directory, or from `$REPORT_DEPS_DIR` when
the project keeps them elsewhere (a workspace package, an `e2e/` folder).

## Configuration

Everything a reader sees is configurable; defaults are neutral English, a system font stack
and no external request. Keys, all optional:

| Key | What |
|---|---|
| `lang`, `title`, `heading`, `eyebrow`, `lede` | Page language and header copy |
| `environment` | One line: where the walk ran |
| `benchSize` | Total cases in the bench, so coverage reads "71 of 75" |
| `journeys` | `{ "J01": { "title", "summary" } }` — also fixes the order |
| `limits` | `[{ "title", "text" }]` — what the method does not cover. Empty prints a warning in its place |
| `strings` | Every UI string, including `verdicts` (localised labels for PASS, PARTIAL, FAIL, UNVERIFIABLE), `methods`, `severity`, `support` |
| `palette.light`, `palette.dark` | Colour tokens: `paper surface ink muted line accent accentInk ok okBg warn warnBg bad badBg nv nvBg` |
| `fonts` | `stylesheet` (a font CSS URL, the only external request allowed) and `display`, `body`, `mono` stacks, which stay as fallbacks |

The JSON keeps canonical tokens; only the page shows localised words. A Spanish report, for
instance, sets `strings.verdicts` and the rest of `strings` and changes nothing in the walkers'
files.

## Try it on the fixture

`fixture/` is a synthetic product — a shared tool library — with two journeys, five checks,
one defect, two audits (one row completed by the orchestrator from an orphan) and placeholder
screenshots.

```sh
node build-report.mjs --out /tmp/cert-fixture --config fixture/report.config.json fixture
node check-report.mjs /tmp/cert-fixture/report.html
node --test build-report.test.mjs   # what the generator must refuse; no dependencies
```
