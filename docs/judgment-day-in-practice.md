# Judgment Day, after running it

The `judgment-day` skill in this kit is copied from gentle-ai at version 1.4 and left
untouched. This page is what running it taught, and in one place it contradicts the
skill. That contradiction is the most valuable thing here, so it goes first.

## A finding only one judge raised is a suspect, never noise

The skill says: *one judge finds an issue → suspect; report and triage, do not
auto-fix*. Read quickly, that becomes "confirmed means both judges said it", and
everything else gets dropped.

Dropping it would have cost two of the best findings of the night, on the same slice.
Two blind judges reviewed a new route that let a staff member act on a customer's
behalf. Each found something real. **Neither finding was raised by both.**

One: a list offered the new action on every item while the screen behind it refused
some of them, so a button led to a dead end.

Two, and sharper: someone who had closed their account could still be acted on, and
billed. That invariant had never been written down anywhere — closing an account
destroys the session, so until that route existed nobody could reach the action without
one. The route did not open the hole; it stopped resting on the assumption that hid it.

So the rule as practiced is: **a single-judge finding is a suspect you verify
yourself**. Not another judge — the orchestrator, reading the code. It costs minutes
and it is the difference between two judges and one judge with redundancy.

## Judges must not touch the tree

They run in parallel over the same code. A judge that verifies a test by removing its
guard is doing something reasonable in isolation and corrupting the other judge's read
while doing it. The tell is a regression that vanishes on a second look.

Tell them explicitly: read-only, and if you must run something, run suites, not edits.

## Tell them what is already known

A judge that does not know what is already registered as debt reports it back to you
as a finding. Two or three rounds of that and the reports stop being read.

Every judge brief here ends with a short "you already know this" list: the debts, the
open decisions, the gaps that are deliberate. It costs a paragraph and buys signal.

## Grepping for the defect's text is not verification

A good fix usually leaves the defect's text behind, in the comment explaining what was
removed. The grep hits, and the reader concludes nothing was done.

This produced a false accusation against an agent that had done the work correctly.
The corollary matters as much and points the other way: a comment that spells out the
literal it fixed is indistinguishable from the defect to anything mechanical, so
describe a defect without reproducing it.

## Verify behaviour, and prefer mutation

The strongest verification available is not "the test passes". It is: **break the fix
on purpose and watch the test fail for the right reason.**

Every load-bearing half of a predicate should be mutated on its own. A guard with two
conditions, mutated as a unit, tells you only that at least one of them matters. One
fix rested on a status check and an ownership check in the same `WHERE`; removing the
status alone turned one winner into twenty, and removing the ownership check alone broke
a different test. Both halves proved load-bearing, separately.

## Two judges and a fix agent is a re-judge, not a hand-off

After a fix lands, both judges run again before anything is committed. The second round
is cheap and it is where a fix that repaired one caller and broke another shows up.

## What a green suite cannot see

None of this catches the class of defect that has no assertion. A suite proves the
assertions someone thought to write, and it plants the state it needs — so it passes
over exactly what a person meets first: a button leading nowhere, a screen reachable
only by typing its URL, a number that is a literal, an empty day hiding a full week.

Judges read code and miss these too, for a different reason: each reads one file at a
time. Two screens that disagree about the same state look like two unrelated behaviours
until somebody sees both rendered.

That is what the browser walker is for, and it is not optional. Every finding in this
paragraph shipped here under a green suite and two clean verdicts.
