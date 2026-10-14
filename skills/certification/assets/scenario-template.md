# Acceptance scenarios: the format certification can read

A feature is a set of user stories. Each story carries numbered acceptance scenarios in
Given/When/Then. Spec Kit's `speckit-specify` produces exactly this shape; any tool that
does, or a hand-written file, works the same. What matters is not the tool but two
properties of every scenario, because a certifier will later have to prove it on a screen.

## The two rules

**A scenario names its actor.** "When the member requests the drill", never "when a request
is made". Certification walks as a person; a scenario without one cannot be walked, only
argued about.

**A scenario is observable on a screen or in an API response, never by reading code.**
"Then the steward's queue shows the drill on top" can be certified. "Then a row is written
with status pending" cannot — that is what the scenario is *about*, not evidence that it
holds. If the only proof is in the database, say which screen or endpoint would show it, or
accept that this row will come back UNVERIFIABLE.

A scenario that breaks either rule costs nothing to fix while it is being written, and a
certification round to discover later.

## Template

```markdown
### User Story <n> - <title> (Priority: P<n>)

<The journey in plain language: who, what for.>

**Why this priority**: <the value>.

**Independent test**: <how this story is proved alone>.

**Acceptance Scenarios**:

1. **Given** <state a seed or a previous step can produce>, **When** <actor> <does what>,
   **Then** <what is visible, to whom: the value, the state, the message, the count>.
2. **Given** …, **When** <another actor> …, **Then** …
```

## Writing the Then

- Name who sees it. If the effect shows up on *another* user's screen — the steward sees what
  the member did — write both: that is a cross-user check, and it is the strongest evidence a
  certification produces.
- Give the number when there is one. "The queue holds 2 requests" is checkable; "the queue
  updates" is not.
- Name the message, not its tone. "Shows *This tool is on loan until Friday*" beats "shows a
  clear message".
- "Calling the API directly" is a real scenario for permissions: write the status and the
  body ("another member reading B's history gets 403 and no loan data").

## Ids

Cite scenarios as `F<feature>-US<story>-<scenario>`, e.g. `F003-US2-4`. Bench cases, defects
and certification rows all point back here by that id, so never renumber a scenario that has
been cited; append instead.

## The Given is a seed requirement

Every Given describes state that must exist before the scenario can be walked. Collect them:
they are the seed's specification (see `seed-checklist.md`). A Given nothing can produce is a
scenario nobody will ever certify.
