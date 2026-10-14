# Per-walker brief · `<walker id>` (certifier-e2e)

One per walker, short: the common brief carries the rules. What goes here is what makes this
walker's lot different from the others — and the cross-user checks, written out, because a
walker left to infer them walks each user alone and calls it done.

```markdown
# Brief <walker id> (certifier-e2e) · <one-line theme of the lot>

Checkout: `<worktree path>` (detached at `<short hash>`). Read
`<path to walker-brief-common.md, filled>` first and follow it to the letter.

## Your journeys

- **J01 · <journey title>** — <case ids, seed cases first: B-01 (seed), B-02..B-07>.
  Cross-user checks: <user X does Y → user Z sees W, before and after>.
  Preparation not certified: <steps you need but do not certify, e.g. create the second
  member through the invitation flow>.
- **J02 · <journey title>** — <case ids>.
  Cross-user checks: <…>.
  Substitutions allowed: <case B-11 needs a physical phone: emulated viewport → PARTIAL>.

Order: read-only seed cases first (read the metrics before touching anything); then the ones
that consume state.
Generated inputs only: <images, files> made by you under `<scratch path>`; nothing real.
JSON: `checks-<walker id>.json`.
```

## How the orchestrator fills it

- **Journeys** come from grouping the bench into cross-user stories a person would recognise
  ("borrow a tool", "moderation back and forth"), not from the bench's own groups.
- **Lots** split journeys by the state they consume. Two journeys that both spend the same
  seeded record go to the same walker, or one of them is walked on a seeded equivalent and
  marked PARTIAL.
- **Cross-user checks** are listed explicitly, with who acts and who sees. They are the
  checks that prove the product works between people, and the ones a walker drops first.
- **Allowed substitutions** are listed up front, so a reduced proof is a PARTIAL with a name,
  not a silent PASS.
