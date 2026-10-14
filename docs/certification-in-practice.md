# Certification, after running it

The `certification` skill and its two agents come from one product, over one week in October
2026: a few stories certified one at a time as they were claimed done, then the whole product
certified in a single round before a review with its owner. This page is what that round
cost and what it taught. The product is not named; the numbers are its own.

## What the owner asked for

Not "are the tests green" — they were. The owner wanted what a manual QA hands over: the
product used by several people, screenshots of every promise, and each action checked from
the screen of the person it affects. The moderator approves; does the buyer see it? A report
a non-technical reader can open and believe, or not, by looking.

That request shaped everything else. A screenshot is only evidence if it shows the claim, a
claim between two people needs both screens, and a report nobody can check is a press
release.

## The round, in numbers

| | |
|---|---|
| Bench | 93 manual cases derived from the specs' acceptance scenarios |
| Out of scope, declared | 5 — two operate on real data that never reaches test, three exercise a developer-only mode |
| Journeys | 11, each crossing users, covering the other 88 cases |
| Checks | 88, with 338 screenshots |
| Walkers | 4, in parallel, each on its own checkout, stack and seed; 31 to 40 minutes each |
| Auditors | 4, one per walker, 3 to 4 minutes each |
| Verdicts | 82 PASS · 6 PARTIAL · 0 FAIL · 0 UNVERIFIABLE |
| Audit gaps | 12 in checks the walkers had reported as done; 3 closed from orphan screenshots |
| Audit, final | 79 of 88 checks with the evidence supported; the other 9 marked PARTIAL on the page |
| Defects | 6 — one medium (not reproduced, logged as such), five low |
| Report bugs | 1 — the viewer opened the wrong image on every click |

The walk itself was the short part. Most of the work had been done earlier, in the bench and
the seed.

## Why a second agent reads every image

Four walkers reported 88 checks as done. Four auditors, given only the JSON and the images,
found 12 that the images did not fully support. None was a fabrication. They were the
ordinary ways a walker's confidence outruns its evidence:

- **The decisive value lived only in the strip** — the line the walker paints at the top of
  every screenshot saying who looks and what was read. "10 per page, 16 without repeats" in
  the strip; one card on the page. The strip is the walker's caption of its own work. It is
  useful; it is not evidence. One per-story certification had already shown why: the strip
  said three rows where the page beneath showed four.
- **Below the fold.** The count was right, and off-screen.
- **A cross-user tag without the second screen.** The walker had seen it and not captured it.
- **A screenshot that contradicted the walker's own notes.** One walker wrote that every page
  rendered with its styles; one of its images showed a page with none. The auditor reported
  it, the orchestrator logged it as a defect, and it never reproduced — so it stands as
  medium, "to be confirmed", rather than vanishing.

The certifier cannot catch these in its own work, for the same reason an author cannot
proofread their own sentence: it reads what it meant. Hence rule 1, and one auditor per
certifier rather than one for all of them — the audits ran as each walker finished, and none
took longer than four minutes.

## Orphans before re-walks

Auditors list every screenshot in a walker's folder that no row cites. There were 25. Three
of the twelve gaps were closed by images already on disk: the walker had taken the
screenshot that proved the row and forgotten to cite it. Opening them cost minutes; a
re-walk would have cost a stack, a seed and half an hour. The orchestrator cites them after
opening each one, and the audit row says who completed it.

## Why walkers never share a browser

Single-story certification drove the browser MCP, and with one walker that is fine. With four
running at once it breaks in a way that looks like flaky product behaviour: the
MCP's browser may be shared between agents, and cookies on `localhost` ignore the port, so
one walker signing in as the moderator signs another walker's buyer out. Each walker drove
its own browser from its own scripts instead, one isolated context per user. That turned out
to be the stronger design on its own terms: a cross-user check means two real, independent
sessions, which is what a person on another device has.

API probes followed the same logic. A request context detached from the page returned 401
where the same call from the user's page returned 200. Probes go through the page, with its
session — the one the person actually has.

## Why each walker owns its stack

A walk is not read-only. It approves records, pauses them, reports sales, uses invitations.
Two walkers on one stack would each find the other's footprints and call them defects.
Journeys were split into lots by the state they consume, and every walker brought up its own
stack, seeded it, walked, and tore it down.

The split is not free. Of the six PARTIALs, four were cases that needed data another journey
creates — a product made in the signup journey, read in the catalogue journey. The walker
used a seeded equivalent and said so. That is the right call, and it is also the cost of the
split: plan lots so that a journey's data dependencies land on the same walker where you can.
The other two PARTIALs were an emulated phone in place of a physical one, and one step
skipped by a correction made before saving. PARTIAL exists for exactly these: forcing them
to PASS or to FAIL would have lied either way.

## The seed is part of the bench

Before the seed covered every state the bench reads, a fresh stack opened with empty queues,
zero metrics and no notices, and half the cases could not be walked. The cases were right;
there was nothing on the screen to check them against. The seed grew to produce every state
— draft, in review, published, paused, rejected with its note, hidden with pending changes,
expired invitations, past sales and events over two weeks — and a contract test pins its
shape, so the exact figures the bench quotes cannot drift silently.

The bench had its own version of that lesson. It lived as data inside a page, and a syntax
error in the middle silently hid every case after it: the page rendered what came before and
nothing else. A test that parses the whole bench found it.

## The spec outranks the bench

One walker found that the bench expected an error message the spec never required: the spec
asked only for the API to refuse. The screen did refuse, with a different message. That is a
bench defect, not a product failure, and it was logged as one. A wording difference coherent
with the spec is a note. Without the rule, a walker either fails a correct product or
quietly rewrites the bench, and both corrupt the round.

## The viewer that opened the wrong image

The first published report looked perfect and was wrong on every click. Thumbnails were
numbered in one order (defects first) and the viewer's list was built in another (journeys
first), so each click opened some other screenshot, captioned as the one clicked. Every image
existed; every count was right; the page passed every check that did not involve clicking.

The fix registers each thumbnail's viewer entry as the thumbnail renders, so the two cannot
diverge. The check that would have caught it clicks every thumbnail and compares the image
that opens with the one clicked. It now ships with the generator, and reintroducing the old
ordering fails it on every thumbnail. Same lesson as everywhere else in this kit: verify the
behaviour, not the artefact.

## What the method does not cover

The report says so in its own section, and the generator prints a warning in its place when
the list is empty. For this round: a real identity provider (a simulated one ran locally),
physical phones (emulated at 390 px), the messaging app a contact button opens (only the
outbound link and its prefilled text were checked), the cloud environment (everything ran on
local stacks), and the five cases above. A report that claims to cover everything is not
believable, and the reader deserves to know where the evidence stops.

## No human was in the loop

Certifier and auditor are different agents with different information — one walks and
writes, the other only reads the images — and that separation found twelve gaps. But both
are models. Before anyone signs on the strength of a report like this, a person should open
10 to 15 screenshots at random and check them against their rows. It takes a quarter of an
hour, and it is the only step in the method that is not a model checking a model.
