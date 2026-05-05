# Security Principles — pi-ensemble

pi-ensemble is a local coordination layer for coding agents. These principles are fixed for v0.1; any violation is a bug, not a feature.

## What pi-ensemble does

- Reads and writes local files inside `.pi-ensemble/`.
- Provides structured handoff, mailbox, blackboard, and worktree-claim files.
- Logs inter-agent events to `audit.jsonl` for human review.

## What pi-ensemble never does in v0.1

1. **No network** — no HTTP, sockets, cloud sync, or webhooks.
2. **No process spawning** — never creates, wakes, kills, or supervises agents.
3. **No code execution** — never runs commands on behalf of an agent.
4. **No credentials** — never handles, stores, extracts, or proxies secrets.
5. **No hidden persistence** — no daemons, cron jobs, launch agents, or systemd units.
6. **No remote sessions** — designed for single-user local development only.
7. **No automatic routing** — humans decide which agent receives which handoff.

## Threat model

An actor who can write to `.pi-ensemble/` can place messages in agent inboxes. Treat inboxes and the blackboard like source files: review them before acting, keep normal filesystem permissions, and do not store secrets there.

## Reporting

If you discover behavior that violates these principles, open an issue or remove the package. The safe failure mode is to delete `.pi-ensemble/` and recreate it.
