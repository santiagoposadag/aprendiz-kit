# Delegation brief template

Every section earns its place: each one exists because omitting it produced a bad slice.
Placeholders in `<angle brackets>` are the project's answers; fill them once per project
and keep them current.

## Language contract (non-negotiable)

- Code, identifiers, comments, test names: **<code language>**.
- User-facing UI copy: **<UI language>**, citing the requirement that fixes it.
- Vocabulary rules, if the product has any — words it must never use and the word to use
  instead — and the command that enforces them. A rule the brief states but nothing
  checks will be broken by the first agent that did not read the brief closely.

## Read first

List the exact files, with line numbers where it matters: the story being implemented,
the authoritative definition it depends on, and the closest existing analogue to copy
structure from. Naming the analogue is what keeps a slice consistent with the repo
instead of inventing a second style.

## What ALREADY EXISTS — do not rebuild it

Say what works and cite it. Correct any stale claim in the story's notes on the current
state of the code yourself, before the agent trusts it — those notes rot, and an agent
that believes one rebuilds something that already works.

## Scope

State the outcome, not the implementation. Let the agent design, but list the constraints
it must satisfy — status codes, row scope, idempotency, what must survive.

## Decisions already made — do not re-open

Name the resolved decisions and their values. List the accepted assumptions the agent must
NOT report as findings; a reviewer returning a decision you already took wastes attention.

## Decisions NOT made — do not invent

If a criterion depends on an unwritten business rule: implement the rest, state the
assumption in code, and propose an entry for the open-decisions ledger. Say this
explicitly — silence gets read as permission to choose.

## Tests

Strict TDD: write the spec first, watch it fail, then implement. Name the spec file and the
analogue to copy. Anything phrased "calling the API directly" must be probed against the
API, never only through the UI. Prefer unit tests for pure logic, e2e only for what needs
the running system.

Add: do not loosen, edit or delete an existing assertion to make the suite pass — report
the conflict instead.

## Environment

State what is already running and where (<web URL>, <API URL>, <database>). Do NOT start,
restart or reseed them. Give the demo credentials and ids. **Tell the agent to mint its own
fixtures** rather than acting on the shared demo accounts.

## Definition of done

<typecheck command> and <test command> clean; state the exact current baselines
("<N> passed / <N> skipped / 0 failed", "<N> unit") so a regression is arithmetic, not
judgement. Say which commands check nothing — a script that exists and exits 0 without
validating anything — so the agent does not report them as evidence. **Do NOT commit** —
the orchestrator commits.

## Report back

Files changed; the design choice and why; exact test counts; what was registered as debt;
anything unsatisfied with the precise reason. Close with: "Be honest about gaps — I verify
the tree and run the suite independently." Say it, then actually do it.
