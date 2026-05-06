# pi-ensemble roadmap

`pi-ensemble` should grow from a tiny local coordination substrate into a practical orchestration layer for hybrid coding-agent workspaces, without losing its core invariant:

> The source of truth is a readable local filesystem protocol. No daemon, no spawn, no network, no hidden state in core.

## Positioning

`pi-ensemble` is not a replacement for Claude Code Agent Teams, Claude Squad, multiclaude, AMQ, tmux launchers, or full mission-control TUIs.

It is the smaller layer underneath or beside them:

```txt
blackboard + mailbox + claims + audit
```

For the szt.link environment, the intended pattern is:

```txt
Felipe → Pi maestro → pi-ensemble → Claude Code / Pi / Codex workers in tmux
```

Pi keeps the field, priorities, attribution, decisions, and synthesis. Workers execute bounded tasks in separate contexts.

## Design principles

1. **Core stays file-only** — no process lifecycle, no network, no tmux dependency.
2. **Adapters are allowed** — tmux wake, dashboards, launchers, watchers, and package integrations live outside core.
3. **Humans can inspect everything** — deleting the tool must leave the collaboration legible.
4. **No long tmux prompts** — long messages go to inbox/files; tmux carries only wake pings.
5. **Claims before concurrency** — path/worktree ownership must be explicit when workers overlap.
6. **Pi maestro, workers bounded** — orchestration should reduce Felipe-as-relay, not create autonomous drift.

## Current state — v0.1 alpha

Implemented:

- CLI: `init`, `status`, `note`, `send`, `inbox`, `board`, `claim`, `release`.
- Core file layout under `.pi-ensemble/`.
- Markdown blackboard and inboxes.
- JSON audit log and worktree/path claims.
- Pi package extension with slash command and tool.
- Local szt.link install and `ensemble-tmux` adapter.
- Docs: `SPEC`, `SECURITY`, `AUDIT`, `ADAPTERS`, `LANDSCAPE`.

Known limitations:

- No formal task object yet.
- No agent registry beyond inbox folders.
- No read/ack semantics beyond inbox clear archive.
- No conflict policy for overlapping claims.
- No worker lifecycle or session discovery in core.
- Slash command parsing is intentionally minimal.

## Phase 1 — Harden the substrate

Goal: make v0.1 safe and boring.

Deliverables:

- Add `docs/QUICKSTART.md` with Pi, Claude Code, and generic terminal examples.
- Add `docs/MAESTRO.md` with the Pi maestro + worker pattern.
- Add minimal tests for core operations using Node test runner.
- Add validation for agent names and message types across CLI/extension.
- Add `--json` output mode for `status`, `inbox`, and `board` where useful.
- Improve `claim` behavior:
  - warn or fail on already-claimed paths;
  - record previous owner in audit;
  - document shared/read-only claims.

Acceptance:

```txt
A new user can install pi-ensemble, initialize a repo, run a two-agent handoff, inspect all files, and understand what happened without reading source code.
```

## Phase 2 — Task files, not orchestration yet

Goal: add bounded work units while keeping core non-spawning.

Proposed layout:

```txt
.pi-ensemble/
  tasks/
    task-0001.md
    task-0002.md
```

Task fields:

- id
- title
- status: `pending | claimed | in_progress | blocked | review | done | cancelled`
- owner agent
- requested by
- allowed paths
- forbidden paths
- acceptance criteria
- result pointer
- created/updated timestamps

CLI/API additions:

```bash
ensemble task create "title" --to claude-a --paths src/foo.ts --acceptance "tests pass"
ensemble task list
ensemble task show task-0001
ensemble task claim task-0001 --agent claude-a
ensemble task done task-0001 --agent claude-a --result "..."
```

Acceptance:

```txt
Pi can decompose work into task files, dispatch them through inboxes, and collect results without relying on terminal scrollback.
```

## Phase 3 — tmux adapter maturity

Goal: make wakeups reliable while keeping tmux outside core.

Deliverables:

- `ensemble-tmux discover` to list panes and suggest mappings.
- `ensemble-tmux map AGENT PANE` to update local config.
- `ensemble-tmux send` sends long body to inbox and only a short safe prompt to tmux.
- Optional `--attach-command` hints for humans.
- Document pane/window pitfalls, including accidentally landing in an empty tmux window.

Acceptance:

```txt
Pi can wake `claude-a`, `claude-b`, and `claude-c` panes with short pings, and all durable work remains in `.pi-ensemble/`.
```

## Phase 4 — Maestro workflows

Goal: make Pi-as-orchestrator practical without turning core into an auto-runner.

Add workflow templates/docs first:

- parallel audit
- scout → implement → review
- benchmark runner + writer + reviewer
- docs split by files
- adversarial review with two workers

Possible CLI helper:

```bash
ensemble dispatch plan.md
ensemble collect --from claude-a,claude-b,claude-c
```

But the helper should only write tasks/messages. It should not spawn workers.

Acceptance:

```txt
Felipe gives one request to Pi. Pi creates 2–4 bounded worker tasks, wakes workers, collects results, and produces a consolidated decision trail.
```

## Phase 5 — Interop adapters

Goal: let other orchestrators use pi-ensemble as substrate.

Potential adapters:

- Claude Code instructions/plugin wrapper.
- Pi slash command improvements.
- Codex/OpenCode CLI recipes.
- Import/export for AMQ-style maildir/message queues.
- Read-only dashboard that renders `.pi-ensemble/`.
- GitHub issue/PR comment summarizer that reads audit/task state.

Acceptance:

```txt
External tools can either write pi-ensemble files directly or bridge to them without taking ownership of the protocol.
```

## Phase 6 — v1.0 stability

Goal: freeze the file protocol.

Required:

- Versioned spec for `.pi-ensemble/` layout.
- Migration policy.
- Compatibility tests for old state folders.
- Security review.
- Public examples.
- npm publication decision.

Non-goals for v1.0:

- no daemon;
- no remote sync;
- no auto-spawn;
- no background autonomous workers;
- no credential handling;
- no mandatory tmux.

## Immediate szt.link dogfood test

Run a three-worker test on the project itself:

```txt
Pi maestro:
  create tasks and consolidate.

Claude A:
  audit lib/core.mjs for protocol correctness.

Claude B:
  audit extensions/pi-ensemble.ts for Pi package compatibility.

Claude C:
  audit scripts/ensemble-tmux + docs/ADAPTERS.md for tmux safety.
```

Success criteria:

- Felipe only talks to Pi.
- Each worker receives a bounded task via inbox.
- Workers record durable findings via blackboard/result inbox.
- Claims prevent overlapping edits.
- Pi produces one consolidated patch plan.

## Public framing

Use:

```txt
shared workspace coordination for parallel coding agents
blackboard + mailbox protocol for local coding agents
structured handoff for hybrid coding workflows
```

Avoid:

```txt
swarm
hivemind
control plane
agent command bus
autonomous workforce
```
