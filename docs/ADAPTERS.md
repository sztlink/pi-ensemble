# pi-ensemble adapters

`pi-ensemble` core is intentionally file-only. It does not spawn agents, send tmux keys, open sockets, or supervise processes.

Adapters may sit beside it to connect specific runtimes to the same files.

## Pi

Install as a Pi package:

```bash
pi install /path/to/pi-ensemble
# or, after publication:
pi install git:github.com/sztlink/pi-ensemble@v0.1.0-alpha.0
```

After `/reload` or a new Pi session, Pi exposes:

```txt
/ensemble status
/ensemble inbox
/ensemble note <message>
/ensemble send <agent> <message> [--type ...]
```

The registered `ensemble` tool exposes the same operations to the parent agent.

## Claude Code

Claude Code does not need a native plugin for v0.1. It participates through the CLI and files:

```bash
cd ~/implante
ensemble status
ensemble inbox --agent claude --no-clear
ensemble note "durable fact" --from claude
ensemble send pi "handoff" --from claude --type handoff
ensemble claim ./path --agent claude
ensemble release ./path --agent claude
```

Recommended Claude Code session habit:

1. On start, inspect `ensemble status` from the project root.
2. If `claude` has pending inbox items, read with `--no-clear` first.
3. Record durable facts with `ensemble note --from claude`.
4. Send actionable handoffs with `ensemble send pi ... --type handoff`.
5. Claim paths before long edits when Pi or another agent may work in parallel.

## tmux

Tmux is a transport/wake layer, not part of the core protocol.

A tmux adapter should do exactly two things:

1. Write the real message to `.pi-ensemble/` using the CLI.
2. Paste only a short wake prompt into the target pane.

Do not send long instructions through tmux. Long messages belong in inbox files or external handoff files, with tmux carrying only a pointer.

Example adapter behavior:

```bash
ensemble send claude "full handoff body" --from pi --type handoff
tmux paste-buffer -t "$CLAUDE_PANE" # short prompt: read your ensemble inbox
```

This preserves the invariant: deleting the adapter still leaves the collaboration legible in `.pi-ensemble/`.
