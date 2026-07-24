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
    .retired/
      <name>.<timestamp>/  # archived by `ensemble retire`; ignored by status/overview
  worktrees.json
  audit.jsonl
```

Directories under `agents/` whose name starts with a dot are infrastructure and are never listed as agents.

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

## Message ids and lifecycle

`ensemble send` creates a message id (`msg_...`) and writes it into the inbox heading as an anchor:

```md
## 2026-05-06T... — pi → claude [question] {#msg_abc123...}
```

Message lifecycle is audit-only:

- `ack MESSAGE_ID`: recipient or observer records receipt/acceptance;
- `done MESSAGE_ID`: actor records that the handoff/question is resolved;
- `messages [--open]`: reconstructs lifecycle state from `audit.jsonl`.

No scheduler, router, retry loop, or process state is implied by these events.

## Inbox read state

Each agent has `state.json`. `lastReadAt` is updated whenever that agent reads its inbox, including non-clearing reads. Status/overview expose:

- `pending`: total retained message blocks in `inbox.md`;
- `unread`: retained messages newer than `lastReadAt`;
- `stale`: retained messages already read but not cleared.

`ensemble inbox --since-last-read` returns only unread messages, marks them read, and does not clear retained history unless `--clear` is also passed.

## Claims

`worktrees.json` maps resolved paths to current owner metadata:

```json
{
  "/repo/src/foo.ts": { "agent": "claude", "since": "..." }
}
```

A path claimed by another agent cannot be overwritten or released unless the caller uses a force override. Overrides are audited and keep the previous owner in the audit record.

## Agent retirement

Agent identities are cheap to create and were historically never removed, which inflates the namespace and leaves pending messages rotting in inboxes nobody reads. Two operations address this:

- `staleAgents` / `ensemble stale [--days N]` — read-only scan. Last activity per agent is the most recent of: audit events the agent authored (`send`, `note`, `ack`, `done`, `claim`, `release`, `inbox_read`, `inbox_clear`, `init`, retirement it performed), its `lastReadAt`, and its registration time (`state.json` `since`). Being the *recipient* of a message is not activity.
- `retire` / `ensemble retire AGENT... | --stale N` — moves `agents/<name>/` to `agents/.retired/<name>.<timestamp>/` (inbox and state preserved, nothing deleted), force-releases every claim owned by the agent (each release audited with `via: "retire"`), and appends a `retire` audit event recording who retired it, the count of pending messages archived, and the released claims. Sending to a retired name re-creates the agent fresh — retirement archives an identity's residue; it does not ban the name.

## Root resolution

By default, commands search upward from the current directory until they find `.pi-ensemble/`.

For nested repositories or canonical shared ledgers, callers can override root resolution with:

```bash
PI_ENSEMBLE_ROOT=/path/to/workspace ensemble overview
ensemble --root /path/to/workspace overview
```

The Pi extension/tool accepts the same concept via `--root` in slash commands or a `root` parameter in the tool.

## Machine-readable output

The CLI supports `--json` for operations that adapters commonly consume: `note`, `send`, `ack`, `done`, `messages`, `inbox`, `board`, `claims`, `audit`, `timeline`, `overview`, `doctor`, `claim`, and `release`. `status` is JSON by default.

## Health checks

`ensemble doctor` is read-only observability for ledger hygiene. It checks required protocol files, config version, audit JSONL parse issues, agent names, unread/retained inbox summaries, claim path/owner sanity, and nested `.pi-ensemble` folders under the selected root.

## Invariants

1. All state is human-readable.
2. All state-changing operations append an event to `audit.jsonl`.
3. The package never starts processes or runs shell commands.
4. The package never opens network connections.
5. Deleting `.pi-ensemble/` fully resets the protocol.
6. Adapters may wake or visualize runtimes, but the durable source of truth remains `.pi-ensemble/`.

## Pi package surface

- Slash command: `/ensemble ...`
- Tool: `ensemble({ action, agent, to, type, body, path, clear, sinceLastRead })`
- CLI: `ensemble ...`

## v0.1 done when

- `ensemble init/status/note/send/inbox/board/claim/release` work locally.
- Pi extension exposes the same operations.
- SECURITY.md clearly states no network/spawn/exec/credentials/persistence.
- README frames this as shared workspace coordination, not command/control.
