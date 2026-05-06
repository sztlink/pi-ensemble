# Changelog

## v0.1.0-alpha.9

- Added dogfood ergonomics for retained inboxes:
  - per-agent `lastReadAt` state;
  - `unread` and `stale` counts in status/overview JSON;
  - `ensemble inbox --since-last-read` for focused new-message reads without clearing history.
- Updated overview text to show `total` vs `unread` instead of treating all retained messages as urgent.
- Updated tmux wake prompts to suggest `--since-last-read`, reducing duplicate/manual relay friction.

## v0.1.0-alpha.8

- Added canonical root overrides for nested workspaces:
  - CLI `--root PATH`;
  - `PI_ENSEMBLE_ROOT` environment variable;
  - Pi tool `root` parameter;
  - Pi slash command `--root PATH`.
- Documented root resolution to avoid accidental use of nested `.pi-ensemble/` ledgers.

## v0.1.0-alpha.7 — publish candidate

- Documented GitHub Pi package install path.
- Added changelog and release framing for first public alpha.
- Confirmed project-local Pi install from `git:github.com/sztlink/pi-ensemble@v0.1.0-alpha.6` in a clean temp workspace.

## v0.1.0-alpha.6

- Added read-only observability:
  - `ensemble overview`
  - `ensemble timeline`
- Added matching Pi tool/command actions.
- Expanded tests for overview/timeline.

## v0.1.0-alpha.5

- Added ledger inspection commands:
  - `ensemble claims`
  - `ensemble audit`
- Added protocol version to `status`.
- Expanded tests for audit and claims.

## v0.1.0-alpha.4

- Documented Claude Code Agent Teams interop.
- Added runtime recipes for Pi, Claude Code, Codex/generic terminal agents, shell scripts, CI/watchers, and tmux.
- Added Claude lead-session prompt example.

## v0.1.0-alpha.3

- Formalized adapter contract.
- Added public `examples/ensemble-tmux` adapter.
- Made tmux wake prompts shell-safe with `#` prefix.

## v0.1.0-alpha.2

- Hardened core ledger:
  - agent name validation;
  - message type validation;
  - JSON outputs for adapter-facing commands;
  - claim conflict protection and force override;
  - blackboard recovery.
- Added Node test suite.
- Added quickstart and expanded spec.

## v0.1.0-alpha.1

- Added hybrid runtime adapter documentation.
- Bumped alpha after documenting tmux/Pi/Claude boundaries.

## v0.1.0-alpha.0

- Initial public alpha.
- CLI, core file protocol, Pi extension, blackboard, inboxes, claims, audit log, docs, and security boundary.
