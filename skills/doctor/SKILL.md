---
name: doctor
description: "Trigger: doctor, check the setup, is the kit installed correctly, engram not working, playwright not working, browser agents cannot walk. Run the kit's deterministic setup check and report what is missing, what is critical and the command that fixes each."
license: MIT
metadata:
  author: "Santiago Posada"
  version: "1.0"
---

## Activation Contract

Load when someone installs the kit, when a browser agent reports it cannot walk, when
memory seems to be missing between sessions, or before a certification round. You run one
script and relay its result. You do not diagnose by reading configuration yourself: the
script is the check, and a check that depends on a model's reading is not one.

## Execution Steps

1. Run `node doctor.mjs` from this skill's directory (`node <skill dir>/doctor.mjs`). It
   takes a few seconds: it asks the Claude CLI for its plugins and MCP servers, and runs
   `engram doctor`.
2. Relay the result grouped by level, and for every line that is not `ok` give its `fix:`
   command as written. Do not run a fix yourself: installing software and changing the
   user's Claude configuration are the user's decision. Offer to run one if asked.
3. If a critical check failed, say plainly that the browser agents (`verifier-e2e`,
   `verifier-std`, `certifier-e2e`) cannot walk until it is fixed.
4. After the user fixes something, run it again. A fix is confirmed by the check passing,
   not by the install command exiting 0. A new MCP server or plugin needs Claude Code
   restarted before it is visible.

## Levels

| Level | Means | Exit code |
|---|---|---|
| Critical | An agent cannot do its main job: no browser for the browser agents | 1 if any fails |
| Recommended | The kit works and loses something it was built around: memory across sessions, the engram hooks | 0 |
| Optional | One workflow needs it: parallel certification rounds and the report (`playwright`, `sharp` in the certified project) | 0 |

`--json` prints the same result as JSON for scripts and CI.

## What it checks

- **Claude Code**: the `claude` CLI is on PATH.
- **Playwright** (bundled by the kit's `plugin.json`): Node.js 18+, `npx`, Google Chrome
  (the browser `@playwright/mcp` drives by default), the kit's plugin enabled, and no second
  `playwright` server competing with it.
- **Engram** (declared, not bundled — see the README): the `engram` binary, the engram
  plugin (hooks, session tracking, compaction recovery), the engram MCP server registered
  and connected (`engram setup claude-code` — the plugin alone does not register it), `jq`
  and `curl` for the plugin's hooks, and `engram doctor`'s own diagnostics.
- **Certification**: `playwright` or `@playwright/test`, and `sharp`, resolvable from the
  current directory or `$REPORT_DEPS_DIR`.

## Output Contract

Report: READY or NOT READY, the count per level, each failing line with its fix command,
and whether a restart is needed for the fixes to take effect.
