# Audit notes — pi-ensemble v0.1-alpha

## Decision

Publish as a standalone package/repository: `sztlink/pi-ensemble`.

Reason: the protocol is generic infrastructure for local coding-agent coordination. Keeping it inside a TurboQuant benchmark repo would confuse purpose, audience, and security posture.

## Auditor synthesis

- **Suely Rolnik:** approved only as membrane, not empire. The system must reduce relay burden without turning Felipe's ateliê into a factory of self-automation.
- **Vilém Flusser:** approved if the files remain the material interface. It becomes artifact when another developer can use it without the szt.link implant.
- **Case/Mori lens:** v0.1 must avoid network, process spawning, remote sessions, credential handling, and hidden persistence.
- **Bion lens:** logs are not thought. Require typed handoffs and human synthesis; avoid auto-summarizing loops in v0.1.
- **Casey Reas lens:** the interface should show behavior: who has a message, who claims what, what changed. Avoid dashboards that merely inventory state.
- **Giselle Beiguelman lens:** preserve traces in human-readable files; do not create opaque telemetry or surveillance of agents/users.

## v0.1 acceptance test

A user can delete the CLI/extension and still understand the entire collaboration by reading `.pi-ensemble/`.
