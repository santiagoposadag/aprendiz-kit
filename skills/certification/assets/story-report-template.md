# <story id> · <story title> — certification

- **Commit certified:** `<git rev-parse --short HEAD>`
- **Date:** <YYYY-MM-DD>
- **Device / viewport:** <desktop 1280×900 · phone 390×844 emulated · physical device>
- **Contract:** `<path to the spec>`, <story>, scenarios <1 to n> (<requirements cited>).
- **Routes walked:** <who signed in as what, and the clicks from where they landed>.
- **How it was measured:** each screenshot carries a strip with what was read from the page
  or the API at that instant. The strip is a caption; the claim is visible beneath it.
- **Verdicts:** PASS · PARTIAL · FAIL · UNVERIFIABLE <or the project's localised labels,
  mapped one to one>.

| Scenario | Verdict | Evidence | Observation |
|---|---|---|---|
| S1 · <scenario text, short> | PASS | `<story id>/S01a-<slug>-desktop.png` | <what the image shows that decides it> |
| S2 · … | PARTIAL | `<story id>/S02a-…`, `<story id>/S02b-…` | <the substitution, named> |

## Consumed state

What the walk spent: records approved, sold, closed; fixtures minted, by name.

## Console and network

Console errors and failed requests, per scenario; which were expected.

## Rows not verifiable

Which, and the exact blocker (missing fixture, open decision, hardware). Or "None".

## Defects

Each with severity, steps, expected, actual and one screenshot. Logged, not fixed.

---

Audit (`certifier-auditor`, <date>): <SUPPORTED n/n · rows not supported and why · orphans ·
missing images · commit drift>
