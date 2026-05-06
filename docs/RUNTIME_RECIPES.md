# Runtime recipes

These recipes show how different coding-agent runtimes can participate in the same `.pi-ensemble/` ledger without needing native plugins.

## Common rules

All runtimes should:

1. Start from the project root, or set `PI_ENSEMBLE_ROOT=/path/to/project`.
2. Read `ensemble overview`.
3. Read their new inbox items with `--since-last-read` before broad/clearing reads.
4. Claim paths before edits.
5. Record durable facts with `ensemble note`.
6. Return exact result pointers with `ensemble send <target> ... --type result`.
7. Release claims when done.

## Pi

Pi has a native package extension and tool. Use Pi for field framing, synthesis, and cross-runtime decisions.

```txt
/ensemble status
/ensemble inbox
/ensemble note <durable fact>
/ensemble send claude-lead <handoff> --type handoff
```

Recommended Pi role:

- keep the question alive;
- decide what should be mirrored;
- avoid becoming a relay by hand;
- use Claude Agent Teams when Claude-only parallelism is enough.

## Claude Code lead

Claude can use the CLI directly:

```bash
ensemble inbox --agent claude-lead --since-last-read
ensemble send pi "Ack: received" --from claude-lead --type ack
ensemble claim src/foo.ts --agent claude-lead
ensemble note "Started Agent Teams review for src/foo.ts" --from claude-lead
ensemble send pi "Result: findings at docs/foo-review.md" --from claude-lead --type result
ensemble release src/foo.ts --agent claude-lead
```

If using native Agent Teams, mirror only durable milestones. See `CLAUDE_AGENT_TEAMS.md`.

## Codex / generic terminal agent

Any terminal agent can use the CLI:

```bash
cd /path/to/project
ensemble inbox --agent codex --since-last-read
ensemble claim tests/foo.test.ts --agent codex
# do work
ensemble send pi "Result: tests added at tests/foo.test.ts" --from codex --type result
ensemble release tests/foo.test.ts --agent codex
```

If the runtime prefers JSON:

```bash
ensemble status
ensemble inbox --agent codex --since-last-read --json
ensemble claim tests/foo.test.ts --agent codex --json
```

## Plain shell script

A script can mirror external events without being an agent runtime:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /path/to/project
ensemble note "CI finished: $GITHUB_RUN_URL" --from ci-bot
ensemble send pi "CI result: $GITHUB_RUN_URL" --from ci-bot --type result
```

Use stable agent names such as `ci-bot`, `watcher`, `bench-runner`, or `github-mirror`.

## tmux wake adapter

Use tmux only to wake a pane after writing the real message. If the message already exists in the inbox, use `wake`; if not, `send` can write + wake in one step:

```bash
ensemble-tmux wake claude-lead --message "Read your pi-ensemble inbox"
ensemble-tmux send claude-lead "Read your pi-ensemble inbox" --from pi --type handoff
```

The wake prompt should be shell-safe and short. Long message bodies belong in inbox files.

## Worktree convention

If each runtime works in a separate git worktree, claim the worktree root:

```bash
ensemble claim ../worktrees/feature-a --agent claude-lead
```

If multiple runtimes share a worktree, claim specific paths:

```bash
ensemble claim src/auth --agent claude-lead
ensemble claim tests/auth.test.ts --agent codex
```

Do not use `--force` unless a human/Pi intentionally resolves ownership.
