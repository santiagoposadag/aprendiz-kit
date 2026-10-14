# Aprendiz Kit

A fleet of agents, an orchestration skill, and a review discipline for Claude Code —
accumulated by building one product, and shaped almost entirely by what went wrong
while doing it.

Nothing here is a template. Every rule in it replaced a habit that had already cost
something, and the ones that sound strange are usually the ones that cost the most.

## What is in it

**`agents/`** — the fleet. Implementation at three depths, planning at two, verification
at four, certification in two roles that never merge, and one structural reviewer. Plus
the three judgment-day judges, adapted from gentle-ai.

The one worth reading first is `verifier-e2e`, which walks a finished feature in a real
browser. It exists because a green suite proves the assertions somebody thought to
write, and plants the state it needs — so it passes over exactly what a person meets
first.

**`skills/subagent-orchestration/`** — how work is routed, verified and committed. Its
Hard Rules are the compressed form of a lot of wasted afternoons.

**`skills/certification/`** — from acceptance scenarios to a certification an owner can
read with the screenshots side by side: the scenario format, the manual test bench and the
seed behind it, per-story and whole-product rounds, a certifier and a separate auditor, and
a report generator that ships with the check that clicks every thumbnail. Certification
proves only what is written; `verifier-e2e` still goes first.

**`skills/judgment-day/`** — dual blind adversarial review. Copied from gentle-ai,
frozen, unmodified. See `docs/ATTRIBUTION.md`.

**`skills/doctor/`** — a deterministic check of everything the kit depends on, with the
command that fixes each gap. See "What it assumes".

**`docs/`** — why each piece exists.

## Read these

- **[`docs/what-checks-what.md`](docs/what-checks-what.md)** — the dividing question
  between a deterministic check and a judgment agent, and why putting a question in the
  wrong half is how review tooling dies.
- **[`docs/judgment-day-in-practice.md`](docs/judgment-day-in-practice.md)** — what
  running dual review taught, including the one place practice contradicts the packaged
  skill. That contradiction cost two real findings the night it was discovered.
- **[`docs/certification-in-practice.md`](docs/certification-in-practice.md)** — a
  whole-product certification in numbers: 88 checks, four walkers in parallel, four
  auditors who found 12 gaps the walkers had reported as done, and a report viewer that
  opened the wrong image on every click.
- **[`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md)** — what was copied, from where, at
  which checksum, what was changed, and how to refresh it.

## Installing

As a plugin marketplace, from inside Claude Code:

```
/plugin marketplace add santiagoposadag/aprendiz-kit
/plugin install aprendiz-kit@aprendiz-kit
```

Or straight from a local checkout:

```sh
claude --plugin-dir /path/to/aprendiz-kit
claude plugin validate /path/to/aprendiz-kit
```

## What it assumes

**Run the doctor first.** `/aprendiz-kit:doctor`, or `node skills/doctor/doctor.mjs` from a
checkout, checks everything below without asking a model anything and prints, per line,
whether it is critical, recommended or optional and the command that fixes it. It exits 1
only when a critical check fails.

**Playwright MCP**, for the browser — bundled. The plugin starts `@playwright/mcp` at a
pinned version through `npx`, in an isolated profile, and drives the installed Google
Chrome. `verifier-e2e`, `verifier-std` and a lone `certifier-e2e` use it; without Node.js 18+
or Chrome they cannot walk a screen and should say so rather than guess. If you already run
your own `playwright` server, the agents accept it too. The server saves its snapshots and
screenshots under `.playwright-mcp/` in the directory the session runs in, so add that
folder to the project's `.gitignore`; the doctor tells you when it is not. Certifiers running in parallel drive
Playwright from their own scripts instead — a shared browser signs one walker out when
another signs in — so a project that certifies whole rounds needs `playwright` or
`@playwright/test` installed. The certification report's check uses it too, and its WebP
copies use `sharp`. Neither is bundled.

**Engram**, for memory across sessions. Declared, not bundled — several agents list its
tools. Without it they still work and only lose recall. Its complete setup is four steps,
and the third is the one usually missed:

```sh
go install github.com/Gentleman-Programming/engram/cmd/engram@latest   # or: brew install gentleman-programming/tap/engram
claude plugin marketplace add Gentleman-Programming/engram && claude plugin install engram
engram setup claude-code      # registers the MCP server; the plugin alone does not
# plus jq and curl on PATH, which the engram plugin's hooks call
```

Restart Claude Code, then run the doctor.

**Git hooks are the project's, not the kit's.** A plugin cannot install a git hook and
cannot be invoked from a destination project's `package.json`. So the kit does not
*host* the gate; it knows how to *install* one. That constraint turned out to be
correct on its own terms: a gate belongs in the repository it protects, versioned with
the code it makes demands of, inherited by whoever clones it without installing
anything.

**Your project names its own ledgers.** The orchestration skill refers to a debt
ledger, a stories index and an open-decisions ledger. It does not care what they are
called or where they live; it cares that each exists and has one writer per round.

## Status

**Early.** The agents and the orchestration skill have been used heavily on one
codebase. The packaging has not been used on a second one yet, which means the seams
between "the method" and "that project's specifics" are drawn from analysis rather than
from having been wrong about them.

Concretely, still missing:

- The installer skill — the thing that interviews a destination project and writes the
  ledgers, the gate and the definitions with that project's answers in them. Nine
  questions are designed; the skill is not written.
- The deterministic linters. Designed in full for one codebase — layer table, verdict
  per module edge, exception list — and not yet implemented anywhere.
- A second project. Until then, the parameter boundaries are a hypothesis.

## License

[MIT](LICENSE). The files taken from
[gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) remain under gentle-ai's
own MIT license; see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
