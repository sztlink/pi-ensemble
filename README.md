# pi-ensemble

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

Not published yet. Local development only:

```bash
cd /path/to/repo
pi install /absolute/path/to/pi-ensemble
```

Or use the CLI directly:

```bash
node /absolute/path/to/pi-ensemble/bin/ensemble.mjs init
```

## CLI

```bash
ensemble init [--agent pi]
ensemble status
ensemble note "message" [--from pi]
ensemble send claude "handoff" [--from pi] [--type handoff]
ensemble inbox [--agent pi] [--no-clear]
ensemble board
ensemble claim ./worktree-or-path [--agent pi] [--force] [--json]
ensemble release ./worktree-or-path [--agent pi] [--force] [--json]
```

Allowed message types: `note`, `handoff`, `question`, `result`, `ack`.

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
