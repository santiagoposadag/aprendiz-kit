# Seed checklist

The seed is the data a fresh stack starts with. A certification walks what the seed makes
possible and nothing else, so the seed is part of the bench, not a convenience next to it.

**What it cost to learn.** Before the seed covered every state, a fresh stack opened with
empty queues, zero metrics and no notices, and half the bench could not be walked: the cases
were right, there was simply nothing on the screen to check them against. The fix was not
more cases. It was a seed that produces every state a case reads, and a test that keeps it
that way.

## Every state a case reads

Go through the bench's `expected` fields and the scenarios' Givens and list each state they
assume. For a product with a moderated catalogue and transactions, that list looked like
this — adapt the nouns, keep the coverage:

- [ ] Each lifecycle state of each main record, at least once: draft, in review, published,
      paused, rejected **with its note**, hidden-with-pending-changes.
- [ ] Each state of each invitation or token: pending, accepted, revoked, **expired**.
- [ ] Records that carry a moderation note, wherever a case reads the note.
- [ ] Past activity spread over time — sales, visits, clicks, events — so every metric,
      chart and "last 14 days" has something to draw, including a day with zero.
- [ ] Every role a case acts as, with its own account: the person, a second person of the
      same role (cross-user and isolation checks need two), the moderator or admin.
- [ ] Every grouping or category a filter offers, including an inactive one with history.
- [ ] Singular and plural counts somewhere ("1 sale", "2 sales"), if the copy has both.
- [ ] Boundary quantities: a record at its limit (five of five photos), one below it.

## Rules

- **Invented data only.** Accounts on `example.com` (or another reserved domain), invented
  names, generated images. Nothing copied from production, ever — real data never reaches a
  test stack, and a certification must say which cases that rules out.
- **Reserve the names the bench creates.** If a case creates "Test Workshop", the seed must
  not use that name, or the case passes on seeded data it never created.
- **Exact numbers in the bench, guarded by the seed test.** When a case expects "Published 5",
  the seed test asserts the seed yields 5. Change the seed, and the test tells you which
  expected values just went stale.
- **Name what each case consumes.** A walk approves, pauses, sells. Note in the case which
  seeded state it spends, so lots can be split by consumed state (see the skill's rule 3).

## Seed contract test

Write it next to the seed, in the project's test runner. The assertions that earned their
place on the product this came from:

- [ ] Counts per entity and per state match what the bench's seed cases expect.
- [ ] Unique emails, names and any identifier a case looks up by text.
- [ ] Every reference resolves: categories, groupings, the product a sale refers to.
- [ ] Only reachable final states (no state the product itself could never produce).
- [ ] A rejection or adjustment request always carries its note.
- [ ] Media present wherever the state requires it; within the product's limits everywhere.
- [ ] Invented accounts only, matching the seed's naming pattern.
- [ ] No collision with the names reserved for the bench.
- [ ] Derived figures the bench quotes (visible-to-buyer counts, totals) computed from the
      seed and asserted, so a seed edit cannot silently invalidate a case.
