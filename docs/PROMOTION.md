# Promoting pi-ensemble

`pi-ensemble` is useful for a narrow but real audience: people running multiple coding-agent runtimes side by side and losing context in manual handoffs.

## One-line framing

```txt
Local coordination ledger for Pi, Claude Code, tmux, and terminal agents.
```

## Short framing

```txt
pi-ensemble is not an orchestrator, daemon, scheduler, or team manager.
It is a small file-only ledger for handoffs, claims, inboxes, and audit trails across local coding agents.
```

## Who it is for

- Pi users who also run Claude Code, Codex, or shell agents.
- Developers using tmux panes/sessions for parallel agent work.
- People who want durable local handoffs without a daemon or remote service.
- Workflows where the human has become the copy/paste relay between agents.

## Who it is not for

- Users who want auto-spawning agent teams.
- Users who want a cloud dashboard or remote queue.
- Users who want a scheduler/supervisor.
- Casual single-agent chat workflows.

## Install snippets

```bash
pi install npm:@sztlink/pi-ensemble@alpha
```

```bash
npm install -g @sztlink/pi-ensemble@alpha
```

```bash
pi install git:github.com/sztlink/pi-ensemble@v0.1.0-alpha.13
```

## Demo script

```bash
ensemble init --agent pi
ensemble send claude "Please inspect docs and reply with findings." --from pi --type question
ensemble inbox --agent claude --since-last-read
ensemble ack msg_xxx --from claude --body "received"
ensemble send pi "Result: docs look good." --from claude --type result
ensemble done msg_xxx --from pi --body "closed"
ensemble messages --open
ensemble doctor
```

## Pi gallery eligibility

The package includes:

- npm public package: `@sztlink/pi-ensemble`
- `pi-package` keyword
- `pi.extensions` manifest in `package.json`
- public repository: `https://github.com/sztlink/pi-ensemble`

If Pi's package gallery indexes npm packages by keyword, this package is eligible for discovery.

## Notes for posts/issues

Use the phrase **ledger, not orchestrator**. The value proposition is durable coordination without hidden runtime state.
