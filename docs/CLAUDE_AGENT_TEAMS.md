# Claude Code Agent Teams interop

Claude Code Agent Teams already provides the right runtime abstraction for many-Claude parallelism: a lead session, teammates with independent context windows, a shared task list, mailbox, task claiming, and tmux/iTerm display modes.

`pi-ensemble` should not recreate that layer.

Instead, use `pi-ensemble` as the cross-runtime ledger around Agent Teams.

## Recommended architecture

```txt
Felipe / Pi / another runtime
  ↕ durable handoff
.pi-ensemble/
  ↕
Claude Code lead session
  ↕ native Claude Agent Teams internals
Claude teammate A / B / C
```

The Claude lead can coordinate teammates however Claude Code wants. `pi-ensemble` records only the durable boundary events needed by other runtimes and by the human after the fact.

## What to mirror into pi-ensemble

Mirror these events:

- lead accepts a handoff;
- lead claims or releases paths/worktrees;
- lead starts a meaningful Agent Teams run;
- lead finds a durable fact that other runtimes need;
- lead hits a blocker requiring Pi/human/another runtime;
- lead produces a result pointer;
- lead asks a cross-runtime question;
- lead finishes and returns control.

Do **not** mirror:

- every teammate message;
- internal debate;
- transient hypotheses;
- token/cost chatter;
- raw terminal scrollback;
- Claude team topology unless it affects external coordination.

Rule:

```txt
If Pi needs it to decide, publish, avoid conflict, or resume later -> mirror.
If it only helps Claude teammates coordinate internally -> keep it in Claude.
```

## Lead-session startup ritual

From the project root:

```bash
ensemble status
ensemble inbox --agent claude-lead --since-last-read
```

If there is a new handoff, acknowledge it:

```bash
ensemble ack msg_xxx --from claude-lead --body "Claude lead received <task>; preparing Agent Teams run."
```

Claim paths before edits:

```bash
ensemble claim src/module-a --agent claude-lead
```

Record durable start:

```bash
ensemble note "Claude lead started Agent Teams run: security/perf/tests review for src/module-a." \
  --from claude-lead
```

Return result:

```bash
ensemble send pi \
  "Result: Agent Teams review complete. Findings in /path/to/findings.md. No edits applied." \
  --from claude-lead \
  --type result
```

Release paths:

```bash
ensemble release src/module-a --agent claude-lead
```

## Prompt template for a Claude lead

Use this when Pi or a human hands work to a Claude lead:

```txt
You are a Claude Code lead session participating in pi-ensemble.

Before work:
1. Run `ensemble status` from the project root.
2. Read new inbox items with `ensemble inbox --agent claude-lead --since-last-read`.
3. Ack the handoff id with `ensemble ack msg_xxx --from claude-lead --body "received"`.
4. Claim any paths you may edit.

You may use Claude Code Agent Teams internally if parallel teammates are useful.

Mirror only durable milestones into pi-ensemble:
- accepted task frame;
- claims/releases;
- durable findings;
- blockers/questions;
- result pointers;
- final handoff.

Do not mirror every internal teammate message.

When done, send a concise result with exact paths/URLs and release claims.
```

## When to use Agent Teams vs plain Claude lead

Use Agent Teams when:

- work splits into independent lenses or files;
- review/research benefits from multiple perspectives;
- debugging has competing hypotheses;
- the lead can synthesize without heavy same-file conflicts.

Use a single Claude lead when:

- task is sequential;
- one file is edited by everyone;
- coordination overhead exceeds the task;
- a focused patch is enough.

## Failure modes and pi-ensemble fallback

Agent Teams are experimental and can have resume/task-state/shutdown limitations. If the team state is lost but the lead mirrored durable events, Pi can still reconstruct:

- what was requested;
- what paths were owned;
- what result pointers exist;
- what questions/blockers remain;
- who needs to continue.

This is the reason `pi-ensemble` remains separate from Agent Teams.
