---
name: subagent-orchestration
description: "Trigger: delegate work, implement a story, run subagents, adversarial review, judgment day. Route work to the local agent fleet and verify every delivery yourself."
license: MIT
metadata:
  author: "Santiago Posada"
  version: "1.1"
---

## Activation Contract

Load when work will be delegated to the agent fleet, when a slice is about to be
committed, or when adversarial review is requested. You are the orchestrator: you route,
verify, decide, and commit. You do not implement.

## Hard Rules

- **Verify every delivery yourself.** A report is a claim, not evidence. Run the suites and
  read the diff before believing any "green" — and confirm the command validates something.
  A `lint` script can exist, exit 0 and run no linter at all; know which of the project's
  commands actually check something before you trust any of them.
- **Verify behaviour, not the absence of a string.** Grepping for the defect's text is not a
  check: a good fix often leaves that text behind in the comment explaining what was removed,
  so the grep hits and you conclude nothing was done. It has already produced one false
  accusation. Read the line that would do the work, or mutate the guard and watch a test
  fail. The corollary is for the writers too: a comment that spells out the literal it fixed
  is indistinguishable from the defect to anything mechanical — describe the defect without
  reproducing it.
- **A table of cases can look exhaustive and still omit the one cell that matters.** Ask what
  decision the code actually makes, then check the fixtures span it. A scope filter judged by
  three rows — mine, another owner's, another owner's *and* another holder's — never varies one
  axis alone, so it cannot tell a two-field check from a one-field one, and a comment promising
  two fields survives review. Both judges found this the same way: they read the predicate
  first and the fixtures second. Varied-looking rows are not coverage.
- **Agents go idle without reporting.** Inspect the tree, then request the report. Do not
  inspect the instant idle arrives: a half-written file reads as a missing edit.
- **A mid-flight instruction is not an applied instruction — and a stale read is not a
  missing one.** Changing an agent's scope while it works is legitimate, but the message can
  reach it after it has already planned, and it may report "out of scope, untouched" on the
  very thing you just handed it. Verify in the code, not in the report, and re-send the full
  instruction rather than a reminder — it may never have read the first one. The mirror
  failure costs more: messages cross, so re-read immediately before you tell an agent its
  work is missing. Accusing a correct agent invites it to redo green work, which is how a
  verified slice gets damaged. An agent that answers "point me at a concrete discrepancy" is
  doing its job; check your own read first.
- **Parallel writers need disjoint file sets, declared before they launch.** Parallelise by
  default when the sets provably do not overlap; the brief states each writer's set and the
  writer treats anything outside it as read-only. Reach for `isolation: "worktree"` only when
  the overlap is unavoidable — it buys isolation and charges you a merge.
- **Partition by what a change *implies*, not by what it obviously edits.** A slice that adds
  a test in a new directory needs the root manifest to declare a runner for it; a slice that
  adds a dependency needs the lockfile. Manifests behave like ledger files: the root manifest,
  the lockfile and the build-pipeline config belong to one writer per round, or to you. Ask
  "what else must change for this to run?" before declaring the set — a partition drawn from
  the obvious files alone puts two writers in the same manifest.
- **The orchestrator owns the ledger files.** The project's debt ledger, its stories index
  and its open-decisions ledger are what almost every slice wants to append to, and they are
  where parallel writers actually collide. No parallel writer edits them: each one reports
  what it would have written, and you write it once, after merging the reports.
- **Fixture cleanup goes by id, never by prefix.** Minting per-slice fixtures is not enough:
  two writers on one story share its name, so a `DELETE ... WHERE email LIKE '<story>-%'`
  sweeps the other's rows along with your own. It happened: one writer's tidy-up destroyed
  the other's fixtures mid-run, and the parent rows only survived because a foreign key
  refused. A prefix is a namespace both writers occupy; an id belongs to one row. Delete what
  you created, by what you created it as, and treat any green from a run that overlapped a
  sweep as unverified until re-run.
- **Never parallelise against shared fixtures.** Concurrent agents acting on the same seeded
  demo account exhaust whatever it has a limited amount of and turn unrelated specs red. Mint
  per-slice fixtures. Two writers must not run the end-to-end suite at the same time either —
  stagger the runs, or verify both slices yourself once they land.
- **A writer that ran only its own spec has verified only its own spec.** When a slice changes
  something other stories read — a listing, a shared endpoint, a default page size — its own
  suite passing proves nothing about theirs. Two specs went red from a listing that became
  paginated: each agent ran the file it wrote, and the gate caught what four of them had
  walked past. Ask "who else reads this?" and run the whole end-to-end suite, in series,
  before believing a slice is green.
- **A browser walk of an irreversible action consumes the seed.** Walking is not read-only:
  it drives the real product against the real database. Ask a walker to exercise something
  terminal and it will do exactly that, and every spec leaning on the seeded state it just
  spent goes red — a walk closed a seeded record that is terminal by design, and a spec that
  needed an open one could no longer find it. Not the walker's fault: the brief asked for
  it. Either point the walk at minted fixtures, or plan to re-seed and re-run the suite
  before pushing.
- **Commit and push per verified slice, not per batch.** Unpushed green work is the risk.
- **Business decisions are the user's.** When a criterion depends on an unwritten rule,
  implement the rest, state the assumption in code, and file an entry in the project's
  open-decisions ledger. Never pick a policy silently.

## Decision Gates

| Work | Agent |
|---|---|
| Exact edit already written out; renames, link fixes, doc edits | `coder-light` |
| Standard feature from a settled decision | `coder-std` |
| Authorization, row scope, money, migrations, concurrency, destructive jobs | `coder-deep` |
| One mechanical check with a stated procedure | `verifier-light` |
| End-to-end run of a story's criteria | `verifier-std` |
| Probing authz, payment invariants, "calling the API directly" criteria | `verifier-deep` |
| Walking a finished feature for what nobody wrote down | `verifier-e2e` |
| Proving a done story's acceptance scenarios, with screenshots | `certifier-e2e`, then `certifier-auditor` — see `certification` |
| Certifying the whole product before a release or a review | `certification` skill: walkers in parallel, one auditor each |
| Breaking a settled design into ordered tasks | `planner-fast` |
| Architecture, cross-cutting design, open business tradeoffs | `planner-deep` |

| Judgment Day outcome | Meaning |
|---|---|
| Both judges raise it | Confirmed — fix it |
| One judge raises it | Suspect — **verify it yourself**; unconfirmed is not false |
| Judges contradict | Escalate — reproduce the claim before believing either |
| A judge fuzzed and found nothing | Proves its generator never reached the failure, nothing more |

A judge that verifies a test by removing its guard is doing the right thing and breaking the
wrong assumption: judges run in parallel and are supposed to be read-only, so the mutation
lands in the other judge's read. Tell them to restore before reporting, and treat a
"regression that vanished on a second read" as the tell. Verify the tree yourself before
acting on either verdict.

## Execution Steps

1. Map what exists before delegating. Cite `file:line`; never assume.
2. Write the brief from `assets/delegation-brief.md`. An incomplete brief is the usual cause
   of a bad slice.
3. Launch. Read-only work may run alongside one writer.
4. Verify the tree yourself; request the report; reconcile the two.
5. Commit as work units, Conventional Commits, no AI attribution. Push.
6. Before merging anything touching authz, money or sensitive personal data, run
   `judgment-day`: two blind judges in parallel, fix, re-judge. Never synthesise on one
   verdict.

## Output Contract

Report: slices run and their agents, what you verified and how, exact test counts, commits
pushed, decisions filed in the open-decisions ledger, and anything left red with the reason.

## References

- `assets/delegation-brief.md` — the delegation brief template.
- The kit's `agents/` — fleet definitions; frontmatter `model:` beats the session model.
- The project's open-decisions ledger — where open business decisions live.
- The `certification` skill — from acceptance scenarios to an audited certification with screenshots, per story or for the whole product.
