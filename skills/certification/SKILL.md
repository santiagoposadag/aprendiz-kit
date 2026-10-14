---
name: certification
description: "Trigger: certify a story, certify the product, acceptance criteria, manual test bench, QA evidence, screenshots report, release sign-off. Take a feature from its acceptance scenarios to a certification a non-technical owner can read, with screenshots, audited by a second agent."
license: MIT
metadata:
  author: "Santiago Posada"
  version: "1.0"
---

## Activation Contract

Load when acceptance criteria are being written for a feature, when a story is claimed done
and someone needs proof they can open later, or before a release or a review where an owner
will ask "does it work?". You are the orchestrator: you plan, brief, spot-check, reconcile
and publish. You do not walk, and you do not audit.

Certification proves only what is written. It is not the hunt for what nobody wrote down —
that is `verifier-e2e`, and it runs first. Read `docs/certification-in-practice.md` for the
round this was learned from and what each rule cost.

## The flow

1. **Define.** Each feature is a set of user stories; each story carries numbered acceptance
   scenarios in Given/When/Then (`assets/scenario-template.md`). Spec Kit's `speckit-specify`
   is one way to produce them; any tool that yields the same shape works. A scenario must name
   its actor and be observable on a screen or in an API response — never by reading code —
   or it cannot be certified later.
2. **Bench.** Derive manual cases from the scenarios, one or more per scenario, each citing
   the scenario it proves (`assets/bench-case.schema.json`). Build the seed that produces
   every state the cases read (`assets/seed-checklist.md`). Lock both with contract tests:
   case shape, unique ids, group membership, story references, seed shape
   (`assets/bench-contract.test.mjs`).
3. **Build.** The kit's existing orchestration (`subagent-orchestration`). Before certifying,
   `verifier-e2e` walks the feature and its findings get fixed.
4. **Certify.** Per story when it is claimed done; whole product before a release or a review.
   One certifier per story or per lot, one auditor per certifier.
5. **Report.** One page a non-technical owner reads with the screenshots side by side
   (`assets/report/`): verdict totals as filters, a journey map, one row per check with its
   verdict, method, cases, audit line and screenshots, a viewer, the defects, what the method
   does not cover, and the consumed state for auditors.

## Roles — keep them separate

| Role | Does | Cannot |
|---|---|---|
| Certifier (`certifier-e2e`) | Owns a stack and its seed; walks the cases in a real browser; screenshots with an evidence strip; a verdict per check; logs defects; writes `checks-<walker>.json` or the story report | Fix code, the bench or the seed; audit itself |
| Auditor (`certifier-auditor`) | Reads the certifier's output and opens every cited image; SUPPORTED / PARTIAL / UNSUPPORTED per row; flags strip-only claims, cross tags without the second screen, captions that do not match, orphans; writes `audit-<walker>.json` | Open a browser; re-walk; change a verdict |
| Orchestrator (you) | Plans journeys and lots; writes briefs; spot-checks images; reconciles audit gaps; builds and checks the report; commits | Accept a report without looking at the evidence |

## Decision Gates

| Situation | Do |
|---|---|
| Scenarios being written | Apply the two rules of `assets/scenario-template.md` now; fixing a scenario later costs a round |
| Feature built, nobody has clicked it | `verifier-e2e` first; certification only proves what is written |
| One story claimed done, `verifier-e2e` findings fixed | Per-story: one `certifier-e2e` → one `certifier-auditor` → commit report and images |
| Release, review, or an owner asking "does it all work?" | Whole product: journeys → lots → walkers in parallel → one auditor each → reconcile → report |
| Bench or seed changed | Contract tests green before any walk; a broken bench hides cases silently |
| Audit returns gaps | Open the orphans first; re-walk only what no image on disk proves |
| Evidence is command output, not a screen | `verifier-std`, not certification |

## Hard Rules

Each one cost something on the round this was learned from.

1. **The certifier never audits itself.** Four auditors found 12 gaps in 88 checks that four
   certifiers had reported as done.
2. **Parallel walkers never share a browser.** A browser MCP may be shared between agents, and
   cookies on `localhost` ignore the port, so one walker's login overwrites another's. Walkers
   drive the browser from their own scripts, one isolated context per user — which is also
   what makes a cross-user check real.
3. **Each walker owns its stack and its seed.** A walk is not read-only: it approves, pauses,
   sells. Split lots by the state they consume, and have walkers tear their stack down when
   done.
4. **Walk as a person.** Reach the screen by clicking from where a person lands; type a URL only
   when the case is about a link. A screen only reachable by a typed address fails on that.
5. **The strip is a caption, not evidence.** It states who looks and what was read at that
   instant, but the claim must be visible on the page beneath. Auditors marked PARTIAL every
   check whose decisive value lived only in the strip or below the fold.
6. **Never edit a screenshot after capture; retake it.** One strip printed `undefined` and was
   repainted afterwards; it survived only because the auditor confirmed every figure on the
   page beneath.
7. **A cross-user claim needs the second user's screen** — before and after, for any counter.
8. **A case that depends on data another journey creates goes to the same walker**, or is
   walked on a seeded equivalent and marked PARTIAL with the substitution named.
9. **Audit orphans before re-walking.** Three gaps were closed by screenshots already on disk
   that the certifier forgot to cite. You may cite them after opening them, and the audit row
   says so (`"completedBy": "orchestrator"`).
10. **The spec is the authority over the bench.** A wording difference coherent with the spec
    is a note, not a FAIL; a bench case that contradicts the spec is a bench defect.
11. **Defects are logged, never fixed during certification.** Severity, steps, expected,
    actual, one screenshot. A fix mid-round changes the commit being certified.
12. **API probes use the page's own session.** A detached request context returned 401 where
    the same call from the page returned 200.
13. **Verify the report generator by behaviour.** The first published report opened the wrong
    image on every click: thumbnail indexes counted defects first, the viewer list counted
    journeys first. Each thumbnail now registers its viewer entry as it renders, and
    `check-report.mjs` clicks every thumbnail and compares the opened image with the clicked
    one. Run it on every report before anyone sees it.
14. **Declare what the method does not cover**: a real identity provider, physical devices,
    external apps (only the outbound link is checked), cloud environments not walked, data
    that must never reach test. The generator prints a warning in place of the list when it
    is empty.
15. **No human is in the loop by default.** Certifier and auditor are separate agents with
    different information, but both are models. Recommend a human sample — 10 to 15
    screenshots at random — before anyone signs.

## Execution Steps

**Per story.**

1. Confirm `verifier-e2e` ran and its findings are fixed or filed.
2. Brief one `certifier-e2e` with the story's scenarios, the spec, the stack and seed commands,
   and where the report and images go (`assets/story-report-template.md`).
3. When it reports, brief one `certifier-auditor` with the same contract and the report.
4. Open the images behind every row the auditor did not support, and any you doubt. Close
   gaps from orphans where an image on disk proves the row; send back for a re-walk otherwise.
5. Commit the report and its images with the audit line filled.

**Whole product.**

1. Run the bench and seed contract tests. Red means no walk.
2. Group the bench into journeys a person would recognise, crossing users (the round this
   came from: 11 journeys over 88 cases). Write down which cases are out of scope and why —
   they become the limits section.
3. Split journeys into lots by the state they consume (rule 3, rule 8). One walker per lot,
   each on its own checkout and stack.
4. Fill `assets/walker-brief-common.md` once and `assets/walker-brief.md` per walker, with the
   cross-user checks written out. Launch the walkers in parallel.
5. As each walker reports, launch its auditor on its `checks-<walker>.json`. Do not wait for
   the slowest walker.
6. Reconcile: read every audit, open the images behind each gap, open the orphans the auditor
   listed, complete rows from them where they prove the claim (rule 9). Log any defect you
   find yourself as walker `w0`.
7. Build the report: `node assets/report/build-report.mjs --out <dir> --config <config.json>
   <srcDir...>` (`--mode repo` for the copy committed with the PNGs, `--mode publish` for a
   self-contained folder of WebP copies). It fails if a cited screenshot is missing.
8. Run `node assets/report/check-report.mjs <page>`. A report that fails it is not shown.
9. Spot-check a handful of screenshots yourself against their rows, then recommend the human
   sample (rule 15).

## Output Contract

Report: what was certified (story or product, commit), totals per verdict, audit support
(supported of total, gaps closed and how), every FAIL and UNVERIFIABLE with its reason, the
defects by severity, what the method does not cover, the consumed state, where the report and
its evidence live, and whether a human sample has been done.

## References

- `assets/scenario-template.md` — acceptance scenarios a certifier can prove.
- `assets/bench-case.schema.json`, `assets/bench.example.json`, `assets/bench-contract.test.mjs` — the bench and the test that keeps it whole.
- `assets/seed-checklist.md` — the states a seed must produce, and the seed's contract test.
- `assets/walker-brief-common.md`, `assets/walker-brief.md` — whole-product briefs.
- `assets/checks.schema.json`, `assets/audit.schema.json` — what certifiers and auditors write.
- `assets/story-report-template.md` — the per-story report.
- `assets/report/build-report.mjs`, `assets/report/check-report.mjs`, `assets/report/fixture/` — the report generator, its behavioural check, and a synthetic fixture to run both on.
- `agents/certifier-e2e.md`, `agents/certifier-auditor.md` — the two roles.
- `docs/certification-in-practice.md` — the round behind every rule.
