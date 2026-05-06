# pi-ensemble

[![CI](https://github.com/sztlink/pi-ensemble/actions/workflows/ci.yml/badge.svg)](https://github.com/sztlink/pi-ensemble/actions/workflows/ci.yml)

Shared workspace coordination ledger for parallel coding agents.

`pi-ensemble` is a small local coordination ledger: blackboard + mailbox + claims + audit for developers who run multiple coding agents side by side. It is designed for Pi, Claude Code, Codex, or any terminal agent that can read and write files.

It is **not** a daemon, process supervisor, remote-control system, or agent auto-runner.

## Why

When multiple coding agents work in parallel, the human becomes the relay: copy message here, paste result there, remember who owns which worktree. `pi-ensemble` turns that relay into a transparent local file protocol:

```txt
.pi-ensemble/
  config.yaml
  blackboard.md
  agents/<name>/inbox.md
  agents/<name>/state.json
  worktrees.json
  audit.jsonl
```

Files are the protocol. If the tool disappears, the state is still readable.

## Quickstart

See [`docs/QUICKSTART.md`](docs/QUICKSTART.md) for the shortest path. See [`docs/CLAUDE_AGENT_TEAMS.md`](docs/CLAUDE_AGENT_TEAMS.md) and [`docs/RUNTIME_RECIPES.md`](docs/RUNTIME_RECIPES.md) for interop patterns.

## Install

### Pi package from GitHub

```bash
pi install git:github.com/sztlink/pi-ensemble@v0.1.0-alpha.11
```

Reload Pi or start a new session, then run:

```txt
/ensemble status
```

### Local development

```bash
cd /path/to/repo
pi install /absolute/path/to/pi-ensemble
```

### CLI only

```bash
node /absolute/path/to/pi-ensemble/bin/ensemble.mjs init
```

### npm

The npm package is not published yet. Once published:

```bash
pi install npm:@sztlink/pi-ensemble@alpha
```

## CLI

Use `--root PATH` or `PI_ENSEMBLE_ROOT=/path/to/workspace` when running from nested repositories or subdirectories.

```bash
ensemble --root /path/to/workspace init [--agent pi]
ensemble --root /path/to/workspace status
ensemble note "message" [--from pi]
ensemble send claude "handoff" [--from pi] [--type handoff]
ensemble ack msg_xxx [--from claude] [--body "received"]
ensemble done msg_xxx [--from pi] [--body "resolved"]
ensemble messages [--open] [--limit 50] [--json]
ensemble inbox [--agent pi] [--no-clear] [--since-last-read] [--clear] [--json]
ensemble board [--json]
ensemble claims [--json]
ensemble audit [--limit 50] [--json]
ensemble timeline [--limit 50] [--json]
ensemble overview [--limit 10] [--json]
ensemble doctor [--json]
ensemble claim ./worktree-or-path [--agent pi] [--force] [--json]
ensemble release ./worktree-or-path [--agent pi] [--force] [--json]
```

Allowed message types: `note`, `handoff`, `question`, `result`, `ack`.

Inbox reads update per-agent `lastReadAt`. Use `--since-last-read` for focused wakeups: it prints only new messages, marks them read, and keeps retained history in `inbox.md`. `overview` reports both total retained messages and unread counts.

Use `ensemble doctor` when a workflow feels off: it checks required files, protocol version, audit log parse health, claims, agent names, inbox state, and nested `.pi-ensemble` folders that can cause root confusion.

Every `send` returns a message id and writes an inbox anchor like `{#msg_...}`. Use `ack` and `done` for lightweight traceability of handoffs/questions. They append audit events only; they do not schedule, route, or supervise agents.

Canonical/root override examples:

```bash
PI_ENSEMBLE_ROOT=/home/aya/implante ensemble overview
ensemble --root /home/aya/implante inbox --agent pi --since-last-read
```

## Pi commands

When installed as a Pi package, the extension exposes:

```txt
/ensemble init
/ensemble status
/ensemble note <message>
/ensemble send <agent> <message> [--type note|handoff|question|result|ack]
/ensemble inbox
/ensemble board
/ensemble claim <path>
/ensemble release <path>
```

It also exposes an `ensemble` tool for the parent agent to perform the same file-only operations.

## v0.1 boundaries

See [`SECURITY.md`](SECURITY.md). In short: no network, no spawning, no command execution, no credentials, no hidden persistence, no remote sessions, no automatic routing.

## Hybrid runtimes

Pi can use the package extension and tool directly. Claude Code can participate directly or through a lead session that also uses Agent Teams internally. Codex and other terminal agents can participate through the same CLI/files. Tmux wakeups should remain an adapter outside the core protocol. See [`docs/ADAPTERS.md`](docs/ADAPTERS.md) and [`examples/ensemble-tmux`](examples/ensemble-tmux).

## Relationship to existing workflows

`pi-ensemble` generalizes a simple bridge pattern: blackboard for durable shared facts, inboxes for handoffs, audit log for traceability. Integrations with tmux, watchers, or external dashboards should remain outside v0.1.

See [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md) for a benchmark of related Claude Code, Pi, tmux, and terminal-agent orchestrators and why `pi-ensemble` stays smaller: local file protocol, not mission control. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the repositioning from would-be orchestrator toward neutral ledger + adapter protocol.

## Repository decision

Recommended public home: `sztlink/pi-ensemble` as a standalone repository, not inside a benchmark or application repo. The protocol is generic and should not inherit TurboQuant-specific context.
