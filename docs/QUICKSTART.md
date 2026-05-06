# pi-ensemble quickstart

`pi-ensemble` is a local coordination ledger for coding agents. It does not start agents or move work between machines. It only writes readable files under `.pi-ensemble/`.

## 1. Initialize a workspace

```bash
cd /path/to/project
ensemble init --agent pi
ensemble status
```

If you often work from nested repositories or subdirectories, pin the canonical ledger root:

```bash
export PI_ENSEMBLE_ROOT=/path/to/project
ensemble overview
# or per command:
ensemble --root /path/to/project overview
```

This creates:

```txt
.pi-ensemble/
  config.yaml
  blackboard.md
  agents/pi/inbox.md
  agents/pi/state.json
  worktrees.json
  audit.jsonl
```

## 2. Record a durable fact

```bash
ensemble note "Decision: Pi is coordinating; Claude lead will run Agent Teams internally." --from pi
ensemble board
```

Use the blackboard for facts that should outlive terminal scrollback.

## 3. Send a handoff

```bash
ensemble send claude-lead \
  "Please run a three-teammate Agent Teams review. Mirror only final findings back here." \
  --from pi \
  --type handoff
```

The receiver reads only new messages since its last read:

```bash
ensemble inbox --agent claude-lead --since-last-read
```

When the receiver is done:

```bash
ensemble send pi "Result: findings saved at docs/review.md" --from claude-lead --type result
# Optional lifecycle trace:
ensemble ack msg_xxx --from claude-lead --body "received"
ensemble done msg_xxx --from pi --body "resolved"
```

## 4. Claim paths before concurrent work

```bash
ensemble claim lib/core.mjs --agent claude-lead
```

If another agent tries to claim the same path, `pi-ensemble` fails unless `--force` is used:

```bash
ensemble claim lib/core.mjs --agent pi
# Path already claimed by claude-lead...
```

Release when done:

```bash
ensemble release lib/core.mjs --agent claude-lead
```

## 5. JSON mode for adapters

Adapters can use JSON output:

```bash
ensemble inbox --agent pi --since-last-read --json
ensemble claim docs/ROADMAP.md --agent pi --json
ensemble claims --json
ensemble audit --limit 20 --json
ensemble timeline --limit 20
ensemble messages --open
ensemble overview
ensemble doctor
```

## Pi usage

After installing as a Pi package and reloading Pi:

```txt
/ensemble status
/ensemble note durable fact
/ensemble send claude-lead handoff text --type handoff
/ensemble inbox
```

Pi also gets an `ensemble` tool with the same core actions.

## Claude Code / Agent Teams usage

Claude Code can participate through the CLI. See [`CLAUDE_AGENT_TEAMS.md`](CLAUDE_AGENT_TEAMS.md) for the full lead-session pattern.

Recommended lead-session commands:

```bash
cd ~/implante
ensemble overview
ensemble inbox --agent claude-lead --since-last-read
ensemble claim <path> --agent claude-lead
ensemble note "Claude lead spawned Agent Teams internally; durable milestone only." --from claude-lead
ensemble send pi "Result pointer: <path/url>" --from claude-lead --type result
```

Keep internal Agent Teams chatter inside Claude. Mirror only durable milestones, ownership, and outcomes into `pi-ensemble`.

## tmux wake adapter

If `ensemble-tmux` is available, use it only to wake panes. If you already wrote the long inbox message with `ensemble send`, use `wake` rather than `send` to avoid duplicate inbox entries:

```bash
ensemble-tmux wake claude-lead --message "New handoff in inbox"
# or write + wake in one step:
ensemble-tmux send claude-lead "New handoff in inbox" --from pi --type handoff
```

Rule:

```txt
long message -> .pi-ensemble inbox
short wake ping -> tmux
```
