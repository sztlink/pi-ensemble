# pi-ensemble v0.1-alpha spec

## Purpose

A local, file-based coordination protocol for parallel coding agents operated by one developer.

## Non-goals

- Agent spawning or supervision
- Network sync or remote execution
- Automatic LLM routing
- Git hooks or background daemons
- Secrets management
- Multi-user collaboration

## Protocol version

`config.yaml` stores `version: 1`. v0.1 treats this as the file-protocol version.

## Directory layout

```txt
.pi-ensemble/
  config.yaml
  blackboard.md
  agents/
    <name>/
      inbox.md
      inbox.read.md  # created lazily on first cleared inbox read
      state.json
  worktrees.json
  audit.jsonl
```

## Agent names

Agent names must match:

```txt
^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$
```

Examples: `pi`, `claude`, `claude-lead`, `codex.1`.

## Message types

- `note`: durable shared observation
- `handoff`: actionable transfer of responsibility
- `question`: explicit question needing answer
- `result`: completed output or artifact pointer
- `ack`: acknowledgement / receipt

## Claims

`worktrees.json` maps resolved paths to current owner metadata:

```json
{
  "/repo/src/foo.ts": { "agent": "claude", "since": "..." }
}
```

A path claimed by another agent cannot be overwritten or released unless the caller uses a force override. Overrides are audited and keep the previous owner in the audit record.

## Machine-readable output

The CLI supports `--json` for operations that adapters commonly consume: `note`, `send`, `inbox`, `board`, `claims`, `audit`, `timeline`, `overview`, `claim`, and `release`. `status` is JSON by default.

## Invariants

1. All state is human-readable.
2. All state-changing operations append an event to `audit.jsonl`.
3. The package never starts processes or runs shell commands.
4. The package never opens network connections.
5. Deleting `.pi-ensemble/` fully resets the protocol.
6. Adapters may wake or visualize runtimes, but the durable source of truth remains `.pi-ensemble/`.

## Pi package surface

- Slash command: `/ensemble ...`
- Tool: `ensemble({ action, agent, to, type, body, path, clear })`
- CLI: `ensemble ...`

## v0.1 done when

- `ensemble init/status/note/send/inbox/board/claim/release` work locally.
- Pi extension exposes the same operations.
- SECURITY.md clearly states no network/spawn/exec/credentials/persistence.
- README frames this as shared workspace coordination, not command/control.
