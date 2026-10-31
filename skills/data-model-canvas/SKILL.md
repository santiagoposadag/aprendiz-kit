---
name: data-model-canvas
description: "Trigger: data model, define entities, model the data, domain model, entity diagram, event catalog, metrics catalog, before implementing the schema. Define a system's data model from its screens before any schema exists, and publish it as an interactive page the owner can review."
license: MIT
metadata:
  author: "Santiago Posada"
  version: "1.0"
---

## Activation Contract

Load when someone is about to design tables, entities or events and the screens already
exist, or when a data model has to be reviewed by people who do not read SQL. You produce
one interactive HTML page that grows with the model, and at the end a repo document that is
the contract. You do not write migrations or code: the model comes first, and an approved
model is what the implementation is checked against.

The examples below use a fictional library that lends books. Replace them with the
project's own domain.

## The template

`assets/data-model-template.html` is a data-driven page: the engine (CSS, diagram drawing,
side panel, metrics tab) never changes, and a new project replaces only the data arrays at
the top of its script. The full schema of every array and field is the comment at the top of
that script. Read it, do not read the engine, and do not duplicate the schema elsewhere.

In short:

- `METRICS` is a list of groups; each metric has `name`, `ev` (the events it uses) and `f` (the formula).
- `D` is a list of domains, one tab each. One has `map: true` (the overview), one has `metrics: true` (the metrics catalog). The rest have `ents` (boxes with `col`/`row` grid placement and `f` fields), `links` (`[from, to, verb, optional custom cardinalities]`), `cons` (interface pieces), `events` and `notes`.
- The shipped data is a worked example. Copy the template into the project, replace the arrays, keep the engine.

The UI copy of the template is English. In the generated artifact, UI copy and example
values follow the target project's language; identifiers stay as they are in the schema.

## Execution Steps

1. **Start from approved screens.** Read the model right to left: from each view, list the
   fields it paints, then go down to where each field is stored and who writes it. Do not
   model before the screens exist; a model with no screen behind it is a guess.
2. **Restate, then run a minimal pilot.** Restate your understanding to the user, then build
   ONE domain as a minimal example and get approval before modeling everything. Expect to be
   corrected on what the example is for: people ask for structure (entities and
   relationships, and the interface pieces composed from them), not a functional trace of one
   case. Publish the page (share it with the user for review) after this first domain.
3. **Split into domains and draw the map.** A domain is a bounded context. Domains connect
   only by keys and events, never by writing another domain's tables. On the map, the third
   column of each box holds row counts for the sample tenant per month, to show scale.
4. **Draw each domain as an entity diagram.** Each box is a 3-column table: field, type,
   example value. Key fields are underlined, computed fields have their own color, entities
   owned by another domain have a dashed border, relationships are 1—N with a verb label.
5. **Use one coherent sample tenant.** Readable ids chain across tabs and tell one story
   (library `ten_riverside` → member `mem_maya` → book `bok_dune` → copy `cpy_dune_01` →
   loan `loan_0042` → fine `fin_0007`). State that real ids are uuids.
6. **Interface pieces.** For each UI construct, list the exact fields it reads, the rule or
   formula that composes it, and a plain-language line. Selecting a piece highlights those
   fields in the diagram.
7. **Events.** For each event: the fields whose change emits it (outbox, same transaction),
   the payload, a provenance badge (`b` key: `existing` shows "existing", `ext` "extended", `new` "new", `ren`
   "renames X" with `was: 'X'`, `dor` "dormant"; any other key throws) and the metrics it feeds. Event→metric links are DERIVED by inverting the
   metrics list: that list is the single source of truth.
8. **Metrics catalog.** Every metric is a formula over events. A metric that cannot be
   written over events does not exist: an event or a field is missing, so add it.
9. **Notes per domain.** Three modeling decisions in plain language.
10. **Promote to the repo.** Once approved, the model becomes a repo doc that is the
    contract (e.g. `docs/NN-data-model.md`), and the event catalog doc is updated to match.
    From then on the doc wins over the page.

Steps 2 to 9 are iterative: republish the page as it grows, so the owner always reviews the
current model.

## Modeling principles

Each of these was a real correction. Check the model against them before publishing.

- **Composition, not inheritance.** A book HAS copies. A copy stores only what distinguishes
  it; fallbacks are explicit (`loan_days = books.loan_days ?? branches.loan_days`).
- **Quantities that vary per place get their own table** (counts per (book, branch)), not a
  column on the book.
- **A state that can be derived is not a stored column.** A loan's overdue state follows
  from `due_at` and `returned_at`. No manual status moves, no board a human must drag.
- **Current state and history live in separate tables** (`copies.status` vs `loans`).
  Screens read state; metrics read history.
- **Values that change every minute are computed in the view** from a stored timestamp
  (days overdue), not stored.
- **What the tenant bought is not a role.** Entitlements are separate from RBAC.
- **Access is a scoped binding** (principal, role, scope). Assign resources by scope
  instead of creating new roles.
- **In a multi-tenant system, a user is global and a membership is per tenant.**
- **In a multi-tenant system, no personal data in events.** Use a pseudonymous per-tenant
  ref (`member_ref`).
- **In a multi-tenant system, every tenant table has `tenant_id` with RLS.**

## Diagram engine gotchas

- Only link boxes that are grid-adjacent. Same row gives a horizontal line, same column a
  vertical one, adjacent column an elbow routed through the column gap. Plan `col`/`row` so
  every link is adjacent, otherwise lines cross boxes.
- Field rows use CSS subgrid so the three columns align inside each box.
- Event names in `METRICS.ev` must match event names in some domain's `events` exactly. A
  typo means no chip appears on that event, while the metric still lists.
- Keep link verbs to 2-3 words (about 14 characters): the label sits in the column gap and
  is clipped by the box beside it if longer.
- Before publishing, extract the inline script and run `node --check` on it.

## Output Contract

Report: the page path, the domains and how many entities and events each has, the metrics
that could not be written over events (and the event or field each one is missing), the
principles the model had to be corrected against, and what the user still has to approve.
