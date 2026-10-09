# What a machine checks, and what an agent does

This kit divides review into two kinds of resource, and the division is not about
cost. It is about what each kind can be trusted to say.

A **deterministic check** answers a question with one right answer, the same way every
time, and it does not get tired on a Friday. A **judgment agent** answers a question
that has no single right answer, and it answers differently each time you ask.

Putting a question in the wrong half is how review tooling dies. A judgment agent
asked to count things produces prose where a number belonged, and nobody can act on
it. A deterministic check asked for an opinion produces false positives, and the third
time someone is stopped by a rule that was wrong, they turn it off — and it stays off.

## The dividing question

**Can the answer be derived from the text of the code, without knowing why anyone
wrote it?**

If yes, it is deterministic. Import direction, cycles, file placement, forbidden
words, whether a declared command exists. These are facts. A script settles them and
should, because a fact re-derived by a language model is a fact with a failure rate
attached for no reason.

If no, it is judgment. Whether two flows that look alike are the same flow. Whether a
rule belongs where it lives. Whether a name lies. These need intent, and intent lives
in comments, in definitions, in the commit that made the split — never in the syntax.

## What goes deterministic

A check earns this half only if it can be **wrong in one direction**: it may miss
something, but it must never flag something correct. That asymmetry is what makes it
safe to put in a gate, and a gate is where its whole value is — it runs on every
commit and never forgets.

Typical members:

- **Dependency direction and cycles.** Which layer may import which, evaluated at the
  granularity the architecture is defined in. Note the granularity carefully: a cycle
  between two directories can be invisible at file level, because the two files that
  form it import nothing themselves. Every off-the-shelf cycle detector reports clean.
- **Type-only imports count as edges.** A rule that forgives them is a rule with a
  hole exactly where the worst violations hide, because a dependency that exists only
  at compile time is the one nobody notices they added.
- **Vocabulary.** Words a product may not use. The table of terms is a decision; the
  scan is a script.
- **Placement.** Documents, definitions and rules that must live in a known directory.
- **Declared commands that do nothing.** A gate step that names a script nobody wrote
  passes every time and protects nothing.

## What goes to an agent

Everything whose answer depends on why, and one rule governs all of it:

**Before proposing to merge, extract or move anything, find the reason it is separate
and quote it.** If the reason still holds, the finding is dead. If the reason expired
— the constraint it named is gone, the decision it deferred got made — that is a
strong finding, because you can show what changed. If there is no written reason at
all, say so; the absence is itself a weaker finding, and must be reported as weaker.

Without that rule a structural reviewer is worse than nothing. It will recommend
unifying two things somebody deliberately kept apart, and the damage is not the wasted
reading — it is that somebody undoes a decision they no longer remember making, and
the reason resurfaces as a bug months later.

Typical members:

- **Domain flows that are the same flow.** Two paths answering one question in two
  places drift silently: one gets the fix, the other does not.
- **Rules with no home.** When two modules each reach into the other for a pure
  function, neither owns it and both need it. The cycle is the symptom; the homeless
  rule is the disease. A script sees the cycle and cannot see the cause.
- **Knowledge duplicated across a boundary.** A shape declared once as a contract and
  again by hand where it is read. A rule enforced in a service and re-implemented in a
  screen.
- **Names and comments that lie.** A comment promising a protection the code does not
  perform is invisible to every tool and expensive to whoever believes it.

## Where the two meet

They are not alternatives. The deterministic half **finds** and the agent half
**explains**, and each is worth more with the other present.

A layer linter reports `billing → orders`. It cannot say whether that is a real
dependency or a pure function borrowed from a neighbour, and the two need opposite
fixes: one is declared and allowed, the other means something has nowhere to live.
That distinction is the whole decision, and only reading tells you.

So the agent's brief should name what the deterministic checks already cover, and
forbid restating it. Its value starts where the mechanical check stops: at intent, at
whether the arrow that is technically legal is the one anybody meant.

## Where the rules live

Neither half owns its own rules. **The definition declares; the tool enforces.**

A vocabulary linter does not decide which words are forbidden — a definition does, and
the script says so in its header and only runs it. A dependency linter does not decide
the architecture; it reads a table somebody wrote on purpose.

This matters more than it sounds. A rule that lives only inside its checker is a rule
nobody can argue with, and it will eventually be argued with by being disabled. A rule
that lives in a definition can be discussed, amended, and pointed at in a review.

## Introducing a rule to code that already exists

A new rule will find violations. That is the point, and it is also the moment the rule
usually dies.

Do not declare the violations legal, and do not stop the world. Land the rule with an
explicit exception list where every entry cites either the comment that justifies it
permanently, or the debt number that will remove it. Then the exceptions are visible
and countable instead of invisible, and the list shrinking is progress somebody can
see.

And write the rule for tests before the first run, not after. A rule that flags a
dozen test files on day one gets switched off on day one, and the reason it was
switched off is forgotten long before the rule is.
