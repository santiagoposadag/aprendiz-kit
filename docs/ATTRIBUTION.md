# Where each piece came from

Some of what this kit carries was not written for it. Where a file is taken unchanged
it is copied **byte for byte**, with no attribution header injected into it, precisely
so that updating it is a `diff` against upstream rather than an exercise in
archaeology. Where a file was adapted, this page says what changed. Provenance lives
here instead of in the files.

## Taken from gentle-ai

[gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) is a separate tool
that manages a section of the user's global `~/.claude/CLAUDE.md` and installs its own
agents and skills. It is MIT-licensed, copyright (c) 2025 Gentleman Programming; the
full license text is in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md), and it
applies to every file in the table below, including the adapted ones.

These files are **frozen at the moment of the copy**, deliberately. The kit trades
staleness for portability: it must work on a machine where gentle-ai is not
installed. That trade has a cost, and the cost is that upstream improvements do not
arrive on their own.

| File | Taken from (installed copy) | Declared version | State | SHA-256 at copy (first 16) |
|---|---|---|---|---|
| `skills/judgment-day/SKILL.md` | `~/.claude/skills/judgment-day/SKILL.md` | 1.4 | unchanged | `1454be78206c5221` |
| `skills/judgment-day/references/prompts-and-formats.md` | `~/.claude/skills/judgment-day/references/prompts-and-formats.md` | — | unchanged | `bce23691898d751f` |
| `agents/jd-judge-a.md` | `~/.claude/agents/jd-judge-a.md` | — | adapted | `f5d71a091fa81c44` |
| `agents/jd-judge-b.md` | `~/.claude/agents/jd-judge-b.md` | — | adapted | `563ef64fe470caf8` |
| `agents/jd-fix-agent.md` | `~/.claude/agents/jd-fix-agent.md` | — | adapted | `7c41b28e6e3e6159` |

The checksum column is the kit's own copy, not upstream's, and it is computed over
the file with LF line endings — `.gitattributes` keeps it that way on every platform.

The `judgment-day` skill's frontmatter declares `author: gentleman-programming`,
`version: 1.4`, `license: Apache-2.0`. It is left as-is because the file is unchanged;
the repository it comes from is licensed MIT, and that is the license the kit honours.
The other files carry no version, so the checksum is the only handle on what was taken.

### What the adapted agents change

Upstream ships the three `jd-*` agents as templates that gentle-ai renders at install
time. Against upstream's `internal/assets/claude/agents/` as of commit `b9c2b3b450`,
the kit's copies differ only in this:

- `model:` is a fixed alias (`sonnet`) instead of the `{{CLAUDE_MODEL}}` placeholder.
- `SendMessage` is added to `tools:`, with a closing paragraph requiring the final
  report to be delivered through it. The same paragraph closes every agent in the kit.
- The two judges also get a paragraph forbidding contact with the other judge: two
  verdicts that influenced each other are one verdict.

Upstream has since rewritten the body of these agents around a review-ledger
contract. The kit's copies predate that and do not include it.

### How to refresh one

```sh
shasum -a 256 <file in this kit>          # compare the first 16 hex digits to the table
shasum -a 256 <the upstream file>         # what upstream has now
diff <upstream> <ours>                    # only if they differ
```

If they differ, read the diff before copying over it. Upstream may have changed
something this kit relies on, and the rest of the kit does not know that. For the
adapted agents, re-apply the changes listed above after copying.

## Declared as a dependency, not copied

**Engram** — persistent memory across sessions, provided by its own MCP plugin. Its
protocol is injected into a session by that plugin, not by this kit, and several
agents here list `mcp__plugin_engram_engram__*` tools. On a machine without it those
tool names simply do not resolve; the agents still work, and lose only the ability to
recall what earlier sessions learned.

It is not copied because copying a protocol whose implementation lives elsewhere
would be copying a promise this kit cannot keep.

**Playwright MCP** — the browser that `verifier-e2e` and `verifier-std` drive, through
its `mcp__playwright__*` tools. Without it those two agents cannot walk a browser and
should report that part of their work as unverifiable.

## Written for this kit

Everything under `agents/` other than the three `jd-*` files, `skills/subagent-orchestration/`,
and everything in `docs/` other than this page. These carry the practice that
accumulated by running the process, and several of them contradict the resources they
were built alongside — where they do, `docs/` says so and says why.
