# pi-ensemble adapters

`pi-ensemble` core is intentionally file-only. It does not spawn agents, send tmux keys, open sockets, or supervise processes.

Adapters sit beside the core ledger to connect specific runtimes to the same files.

## Adapter contract

Adapters MAY:

- call the `ensemble` CLI or tool;
- write normal protocol messages through `note`, `send`, `claim`, and `release`;
- read `status`, `board`, `inbox`, `worktrees.json`, and `audit.jsonl`;
- keep runtime-specific local config outside the core protocol;
- wake panes, render dashboards, mirror events, or bridge other queues.

Adapters MUST:

- keep durable coordination state in `.pi-ensemble/`;
- put long messages in inbox/files, not in transport-specific prompts;
- preserve human readability;
- leave an audit trail for state-changing protocol operations;
- tolerate missing agents/inboxes by creating or reporting them explicitly;
- fail closed when a target runtime/pane is missing.

Adapters MUST NOT:

- treat tmux panes, process ids, session ids, provider/model names, or launcher state as core protocol fields;
- store secrets in `.pi-ensemble/`;
- hide coordination state in adapter-only databases;
- mutate core files in shapes that the CLI cannot understand;
- make the core depend on any specific runtime.

Heuristic:

```txt
Needed to reconstruct ownership, decision, or outcome later? -> core ledger.
Only needed to operate one runtime right now? -> adapter config/state.
```

## Safe wake pattern

Transport prompts are lossy and runtime-specific. The safe pattern is:

```bash
ensemble send claude-lead "full handoff body" --from pi --type handoff
# out-of-band wake carries only a short pointer
```

For tmux, wake text should be shell-safe. Prefix with `#` so accidental paste into a shell pane is a harmless comment, while Pi/Claude still receive a readable markdown-style prompt:

```txt
# pi-ensemble: new inbox item. Run: cd /repo && ensemble inbox --agent claude-lead --since-last-read
```

Do not paste long instructions through tmux. Put them in the inbox.

## Pi adapter

Install as a Pi package:

```bash
pi install /path/to/pi-ensemble
# or, after publication:
pi install git:github.com/sztlink/pi-ensemble@v0.1.0-alpha.2
```

After `/reload` or a new Pi session, Pi exposes:

```txt
/ensemble status
/ensemble inbox
/ensemble note <message>
/ensemble send <agent> <message> [--type ...]
```

The registered `ensemble` tool exposes the same operations to the parent agent.

Pi-specific guidance:

- Pi can act as maestro, but that is a usage pattern, not a core feature.
- Pi should record only durable facts, claims, handoffs, and outcomes.
- Pi should use external orchestrators such as Claude Agent Teams when they already solve runtime-level parallelism.

## Claude Code / Agent Teams adapter

Claude Code does not need a native plugin for v0.1. It participates through the CLI and files:

```bash
cd ~/implante
ensemble status
ensemble inbox --agent claude-lead --since-last-read
ensemble note "durable fact" --from claude-lead
ensemble send pi "handoff" --from claude-lead --type handoff
ensemble claim ./path --agent claude-lead
ensemble release ./path --agent claude-lead
```

Recommended Claude lead-session habit:

1. On start, inspect `ensemble overview` from the project root.
2. If the lead has unread inbox items, read with `--since-last-read` first.
3. If useful, use Claude Code Agent Teams internally.
4. Mirror only durable milestones to `pi-ensemble`:
   - accepted task frame;
   - claimed files/worktrees;
   - result pointers;
   - final handoff;
   - blockers requiring another runtime.
5. Keep ephemeral intra-team chatter inside Claude's team system.

## tmux adapter

Tmux is a transport/wake layer, not part of the core protocol.

An example adapter lives at:

```txt
examples/ensemble-tmux
```

It does exactly two durable things:

1. Writes the real message to `.pi-ensemble/` using the CLI.
2. Pastes a short shell-safe wake prompt into the target pane.

Example:

```bash
examples/ensemble-tmux send claude-lead \
  "Please read your inbox and run the requested review." \
  --from pi \
  --type handoff
```

This preserves the invariant: deleting the adapter still leaves the collaboration legible in `.pi-ensemble/`.

## Dashboard / observability adapters

Dashboards should be read-only by default:

- render `blackboard.md`, inbox total/unread/stale counts, claims, and audit timeline;
- do not become the source of truth;
- if they mutate state, they should do so by invoking the same CLI/tool operations as everyone else.

## Queue / bridge adapters

Adapters for other message queues may mirror into `pi-ensemble`, but should avoid duplicating whole private transcripts. Mirror only:

- external event id / URL / file pointer;
- sender and recipient;
- type (`handoff`, `question`, `result`, `ack`, `note`);
- durable summary;
- result pointer.
