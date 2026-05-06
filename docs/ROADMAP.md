# pi-ensemble roadmap

The discovery that Claude Code Agent Teams already covers much of the “many Claude workers” vision clarifies the project rather than weakening it:

> The stronger orchestrators become, the smaller `pi-ensemble` should remain.
>
> `pi-ensemble` is not the team manager. It is the local ledger/protocol that keeps cross-agent work legible, portable, and auditable.

Core invariant:

> If Pi, Claude Code, tmux, or any adapter disappears, the coordination history must still be readable from files.

## Thesis — form should follow coordination behavior

The durable behavior in hybrid coding workspaces is not “spawn N workers”. It is:

- hand off intent;
- record durable facts;
- mark ownership;
- point to results;
- leave an audit trail;
- wake another runtime when needed.

That behavior suggests a smaller form:

```txt
blackboard + inbox + claims + audit
```

Not this:

```txt
scheduler + team manager + lifecycle controller
```

`pi-ensemble` should express the trace of collaboration, not control the collaboration itself.

## Positioning

`pi-ensemble` sits between runtimes and orchestrators, not above them.

```txt
Felipe
  ↓
Pi maestro / Claude lead / Claude Agent Teams / Codex / other agents
  ↕
pi-ensemble core ledger
  ↕
tmux wake adapter / dashboards / launchers / watchers / bridges
```

What stays inside other systems:

- Agent Teams task decomposition;
- worker topology and specialist roles;
- session lifecycle, resume, shutdown;
- provider/model-specific routing;
- launcher and pane management.

What belongs in `pi-ensemble`:

- durable handoffs across runtimes;
- shared facts worth keeping;
- path/worktree ownership;
- result pointers;
- audit trail;
- minimal coordination state a human can inspect.

## Design principles

1. **Core stays file-only** — no daemon, no spawn, no network, no tmux dependency.
2. **Core is a ledger, not a runtime** — record coordination state; do not supervise sessions.
3. **No team model in core** — no fixed maestro/worker abstraction, even if some users adopt that pattern.
4. **Humans can inspect everything** — deleting the adapters must leave the work legible.
5. **Claims before concurrency** — path/worktree ownership must be explicit when work overlaps.
6. **Adapters translate, core does not command** — wakeups, dashboards, launchers, mirrors live outside core.
7. **Protocol neutrality wins** — Pi, Claude Code, Codex, and future agents should all fit without special privilege.

## Current state — v0.1 alpha

Implemented:

- CLI: `init`, `status`, `note`, `send`, `inbox`, `board`, `claim`, `release`.
- Core file layout under `.pi-ensemble/`.
- Markdown blackboard and inboxes.
- JSON audit log and worktree/path claims.
- Pi package extension with slash command and tool.
- Local `ensemble-tmux` adapter.
- Docs: `SPEC`, `SECURITY`, `AUDIT`, `ADAPTERS`, `LANDSCAPE`.

Known limitations:

- No formal adapter contract yet.
- No JSON-first output mode for easy machine bridging.
- Claim conflict policy is still minimal.
- Inbox read/ack semantics are intentionally simple.
- No versioned migration policy yet.
- Slash command parsing is intentionally minimal.

## Cuts / reframes from the previous roadmap

These items should be removed from the core product direction or demoted to adapters/docs:

- **No evolution toward a built-in maestro/workers system.** That is a usage pattern, not the product.
- **No `dispatch` / `collect` core CLI.** If they exist later, they should be thin wrappers or external helpers.
- **No core task engine as scheduler.** At most, future task files should be receipts/mirrors, not runtime control.
- **No agent registry or session discovery in core.** Runtime presence belongs to adapters.
- **No pane/window orchestration in core.** tmux stays a wake transport only.
- **No Claude-only UX clone of Agent Teams.** Competing at that layer is a category error.

## Priority reset

### Phase 1 — Harden the ledger

Goal: make the current substrate boring, inspectable, and stable.

Deliverables:

- Add minimal tests for core operations using the Node test runner.
- Add validation for agent names, message types, and claim targets.
- Add `--json` output for `status`, `inbox`, `board`, and claim state where useful.
- Improve claim behavior:
  - warn or fail on already-claimed paths;
  - record previous owner in audit;
  - document shared/read-only claim conventions.
- Add explicit protocol version metadata.
- Add `docs/QUICKSTART.md` with Pi, Claude Code, Agent Teams lead-session, and generic terminal examples.

Acceptance:

```txt
A new user can install pi-ensemble, initialize a repo, run a cross-runtime handoff, inspect the files, and understand what happened without reading source code.
```

### Phase 2 — Define the adapter contract

Goal: make adapters first-class without polluting core.

Deliverables:

- Document a minimal adapter contract in `docs/ADAPTERS.md`:
  - what adapters may write;
  - what must remain durable;
  - what belongs only in local adapter config;
  - safe wake pattern: long body in inbox, short ping out-of-band.
- Clarify which fields are protocol and which are adapter metadata.
- Document how adapters should preserve auditability when mirroring external events.
- Keep `ensemble-tmux` explicitly separate from core package concerns.

Acceptance:

```txt
A tmux bridge, a dashboard, and a Claude-side helper can all interoperate with the same .pi-ensemble folder without introducing hidden state into core.
```

### Phase 3 — Claude Agent Teams interop

Goal: make `pi-ensemble` useful beside Agent Teams instead of against it.

Status: first docs/examples landed in `docs/CLAUDE_AGENT_TEAMS.md` and `examples/claude-agent-teams-lead.md`.

Deliverables:

- Document the recommended pattern:
  - Pi or a human talks to a Claude lead session;
  - the lead may use Agent Teams internally;
  - only durable cross-runtime milestones get mirrored into `pi-ensemble`.
- Provide examples for when to mirror:
  - claim ownership before major edits;
  - record durable facts to blackboard;
  - send result/handoff back to Pi or another runtime;
  - keep ephemeral intra-team chatter out of core.
- If tooling is added, keep it as an optional bridge that writes normal `pi-ensemble` files.

Acceptance:

```txt
A Claude lead session can use Agent Teams internally while Pi still sees durable handoffs, ownership, and outcomes through pi-ensemble.
```

### Phase 4 — Neutral multi-runtime interop

Goal: make the protocol feel native to more than Pi and Claude.

Deliverables:

- Harden the Pi package surface.
- Add Codex/OpenCode/generic CLI recipes.
- Document claim conventions for worktrees vs paths.
- Consider tiny helper scripts/examples for other runtimes to append notes, results, and claims without needing a full plugin.

Acceptance:

```txt
Pi, Claude Code, Codex, and a plain shell script can all participate in the same coordination ledger with no runtime having special authority.
```

### Phase 5 — Read-only observability

Goal: add visibility without turning the project into mission control.

Status: first CLI/tool inspection landed with `ensemble overview` and `ensemble timeline`.

Possible deliverables:

- Read-only dashboard rendering `.pi-ensemble/`.
- Timeline/audit viewer.
- Claim inspector.
- Activity summarizer.

Rule:

```txt
Observe from the files first. Do not move control back into the dashboard.
```

### Phase 6 — v1.0 stability

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
- no mandatory tmux;
- no built-in team manager.

## Core vs adapter boundary

Visible in core ledger:

- blackboard notes that matter later;
- inbox handoffs, questions, results, acknowledgements;
- path/worktree claims;
- audit events;
- minimal agent names and timestamps;
- pointers to external artifacts when needed.

Keep outside core / adapter zone:

- pane IDs and tmux window mapping;
- spawn/stop/shutdown/resume semantics;
- Agent Teams topology and worker count;
- provider/model details;
- prompt assembly and ephemeral chatter;
- heartbeats, retries, polling loops;
- launcher state and session discovery.

Heuristic:

> If the information is needed to reconstruct ownership, decisions, or outcomes, it belongs in core.
>
> If the information is only needed to operate a specific runtime, keep it in the adapter.

## Immediate dogfood test

Run the next test on the project itself with the new positioning:

```txt
Pi:
  frames the task, consolidates, and keeps the shared question alive.

Claude lead:
  may use Agent Teams internally for execution/review if useful,
  but mirrors only durable milestones into pi-ensemble.

Codex or another agent:
  contributes a bounded audit/review through the same inbox/claim protocol.

Tmux:
  only wakes sessions.
```

Success criteria:

- Felipe can still talk to one lead surface at a time.
- `pi-ensemble` stores cross-runtime coordination, not every internal team interaction.
- Claims prevent overlapping edits across runtimes.
- Pi can reconstruct the story from `.pi-ensemble/` alone.
- Replacing Agent Teams with another orchestrator would not break the protocol.

## Public framing

Use:

```txt
shared workspace coordination ledger for coding agents
blackboard + mailbox + claims protocol for local coding agents
structured handoff layer for hybrid coding workflows
```

Avoid:

```txt
swarm
hivemind
control plane
agent command bus
autonomous workforce
Agent Teams replacement
```
