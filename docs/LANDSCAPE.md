---
description: Landscape/benchmark of existing Claude Code, Pi and terminal-agent orchestrators informing pi-ensemble
tags:
  - pi-ensemble
  - claude-code
  - pi
  - orchestration
  - benchmark
  - multi-agent
created: '2026-05-05'
---
# pi-ensemble — benchmark/landscape de orquestradores existentes

Este é o levantamento correto que deu origem ao `pi-ensemble`: não TurboQuant/KV-cache, mas o ecossistema de ferramentas que tentam coordenar múltiplos Claude Code/Pi/Codex/terminal agents.

## Pergunta

O que já existe no campo de orquestração local de agentes de código, e onde o `pi-ensemble` deve se diferenciar?

## Achado central

O campo já tem muitos projetos tentando resolver “múltiplos agentes trabalhando em paralelo”, mas quase todos caem em um destes modelos:

1. **mission control / TUI** — gerencia várias instâncias como tarefas em workspaces separados;
2. **tmux spawner** — cria janelas/panes de Claude Code e manda mensagens;
3. **daemon/orchestrator** — controla lifecycle, worktrees e coordenação;
4. **blackboard/memory plugin** — compartilha contexto, mas não necessariamente coordena handoffs;
5. **Pi extension / Claude agent-team clone** — tenta portar o modelo de agent teams para Pi.

A lacuna para o `pi-ensemble` é outra:

> protocolo local, file-only, auditável, sem spawn, sem daemon, sem rede, que deixa qualquer agente participar lendo/escrevendo blackboard + inbox + claims.

Ou seja: menos “orquestrador que controla agentes”, mais **camada de handoff legível entre agentes já existentes**.

---

# Projetos relevantes

## 1. `smtg-ai/claude-squad`

- URL: https://github.com/smtg-ai/claude-squad
- Stars no scan: ~7330
- Linguagem: Go
- Descrição: gerencia múltiplos agentes terminal como Claude Code, Codex, OpenCode e Amp em workspaces separados.
- Modelo:
  - TUI / mission control;
  - múltiplas tarefas em paralelo;
  - workspaces isolados;
  - revisão de mudanças antes de aplicar.
- O que ensina:
  - há demanda real por “vários agentes ao mesmo tempo”;
  - UX centralizada é valiosa;
  - porém é ferramenta grande, com lifecycle/controle.
- Diferença para `pi-ensemble`:
  - `pi-ensemble` não quer ser TUI nem gerenciador de instâncias;
  - pode funcionar por baixo/ao lado de ferramentas assim.

## 2. `dlorenc/multiclaude`

- URL: https://github.com/dlorenc/multiclaude
- Stars no scan: ~542
- Linguagem: Go
- Modelo:
  - múltiplas instâncias Claude Code;
  - tmux window por agente;
  - git worktree por agente;
  - roles: supervisor, worker, merge-queue;
  - daemon/coordenação.
- O que ensina:
  - worktrees são a unidade prática de isolamento;
  - a figura supervisor/worker aparece naturalmente;
  - tmux é o backend visível mais comum.
- Diferença para `pi-ensemble`:
  - não ter daemon;
  - não assumir Claude-only;
  - não impor roles fixos;
  - registrar claims de path/worktree, mas não gerenciar worktree automaticamente.

## 3. `Iron-Ham/claudio`

- URL: https://github.com/Iron-Ham/claudio
- Stars no scan: ~26
- Linguagem: Go
- Descrição: multi-instance Claude Code orchestrator using git worktrees.
- Sinal importante:
  - issue sobre “Inter-Instance Mailbox System”;
  - hoje usa sentinel JSON/completion signals, e quer comunicação bidirecional.
- O que ensina:
  - mailbox é necessidade real;
  - sentinel one-way não basta;
  - comunicação entre instâncias é o gargalo.
- Diferença para `pi-ensemble`:
  - `pi-ensemble` começa pelo mailbox/blackboard como núcleo, não como feature futura.

## 4. `bfollington/claude-blackboard`

- URL: https://github.com/bfollington/claude-blackboard
- Stars no scan: ~11
- Linguagem: TypeScript
- Modelo:
  - plugin Claude Code;
  - blackboard local SQLite;
  - foco em session-independence/context sharing.
- O que ensina:
  - blackboard é um padrão forte;
  - mas SQLite/plugin específico aumenta acoplamento.
- Diferença para `pi-ensemble`:
  - markdown/jsonl legíveis por humanos;
  - não depende de SQLite;
  - não é Claude-only;
  - inbox tipado + claims entram junto.

## 5. `primeline-ai/claude-tmux-orchestration`

- URL: https://github.com/primeline-ai/claude-tmux-orchestration
- Stars no scan: ~25
- Linguagem: Shell
- Modelo:
  - spawn de sessões Claude Code como workers paralelos;
  - heartbeat monitoring;
  - file-based coordination;
  - tmux.
- O que ensina:
  - heartbeat/watcher é útil;
  - file-based coordination é caminho pragmático;
  - tmux paste é frágil para mensagens longas.
- Diferença para `pi-ensemble`:
  - tmux deve ser adapter, não core;
  - mensagens longas ficam em arquivo/inbox, não paste.

## 6. `6missedcalls/swarmux`

- URL: https://github.com/6missedcalls/swarmux
- Stars no scan: ~0
- Linguagem: Shell
- Modelo:
  - tmux + jq;
  - spawn, message, monitor, coordinate Claude Code agents.
- O que ensina:
  - implementação pequena é possível;
  - mas ainda mistura coordenação com controle de processo.
- Diferença para `pi-ensemble`:
  - não spawnar;
  - só escrever/ler estado local.

## 7. `rhysheavensmith/claude-agent-launcher`

- URL: https://github.com/rhysheavensmith/claude-agent-launcher
- Stars no scan: ~6
- Linguagem: Shell
- Modelo:
  - tmux multipane launcher para Claude Code agent teams.
- O que ensina:
  - há uma camada simples de launcher que muita gente quer;
  - mas launcher não resolve memória/handoff/ownership.
- Diferença para `pi-ensemble`:
  - complementa launchers com protocolo de comunicação persistente.

## 8. `MakingJamie/claude-colony`

- URL: https://github.com/MakingJamie/claude-colony
- Stars no scan: ~12
- Linguagem: TypeScript
- Modelo:
  - spawn specialist teams in tmux;
  - steer/watch side-by-side;
  - usa native Claude Code agents.
- O que ensina:
  - “colony/team” é a metáfora dominante;
  - especialização por agente é atraente, mas pode virar rigidez.
- Diferença para `pi-ensemble`:
  - protocolo neutro, roles opcionais;
  - não assume especialistas fixos.

## 9. `tcpsyn/hivemind`

- URL: https://github.com/tcpsyn/hivemind
- Stars no scan: ~1
- Linguagem: TypeScript
- Modelo:
  - GUI desktop para Claude Code agent teams;
  - resolve dor de terminal/tmux com muitos agentes.
- O que ensina:
  - UI vira necessária quando o número de agentes cresce;
  - mas UI não é o primeiro problema do `pi-ensemble`.
- Diferença para `pi-ensemble`:
  - manter core file-only; UI pode vir depois lendo `.pi-ensemble/`.

## 10. `zircote/claude-team-orchestration`

- URL: https://github.com/zircote/claude-team-orchestration
- Stars no scan: ~3
- Modelo:
  - Claude Code plugin;
  - shared tasks, messaging, team patterns;
  - padrões de coordenação como parallel review, pipelines, swarms, large-file analysis.
- O que ensina:
  - padrões de colaboração são importantes;
  - mas plugin Claude-only fecha o escopo.
- Diferença para `pi-ensemble`:
  - o core deve ser ferramenta mínima; padrões podem ser docs/templates.

## 11. `skidvis/pi-coordinator`

- URL: https://github.com/skidvis/pi-coordinator
- Stars no scan: ~6
- Linguagem: TypeScript
- Modelo:
  - extensão Pi;
  - transforma o agente primário em dispatcher/orchestrator;
  - delega para subagentes especialistas.
- O que ensina:
  - no ecossistema Pi já existe desejo de “Pi como coordenador puro”;
  - subagentes isolados são uma vantagem nativa.
- Diferença para `pi-ensemble`:
  - `pi-ensemble` não é só subagent dispatch dentro de uma sessão;
  - é coordenação entre sessões/agentes/processos diferentes.

## 12. `codexstar69/pi-agent-teams`

- URL: https://github.com/codexstar69/pi-agent-teams
- Stars no scan: ~9
- Linguagem: TypeScript
- Modelo:
  - “Claude Code agent teams style workflow for Pi”;
  - task list compartilhada;
  - spawn/stop/shutdown;
  - múltiplas sessões Pi.
- O que ensina:
  - existe tentativa explícita de portar agent teams para Pi;
  - shared task list é útil.
- Diferença para `pi-ensemble`:
  - `pi-ensemble` deve ser mais baixo nível: blackboard + inbox + claims;
  - task list pode ser adapter/módulo posterior.

## 13. `disler/pi-vs-claude-code`

- URL: https://github.com/disler/pi-vs-claude-code
- Stars no scan: ~948
- Linguagem: TypeScript
- Descrição: comparação entre Pi open source e Claude Code fechado.
- O que ensina:
  - o debate Pi vs Claude Code já existe publicamente;
  - Pi é percebido como harness customizável/extensível.
- Diferença para `pi-ensemble`:
  - não entrar como “Pi vence Claude”;
  - entrar como protocolo que permite Pi + Claude + Codex coexistirem.

## 14. `protocol-security/claude-swarm`

- URL: https://github.com/protocol-security/claude-swarm
- Stars no scan: ~4
- Linguagem: Shell
- Modelo:
  - swarm de Claude Code em Docker;
  - coordenação via git;
  - sem orchestrator, sem message passing.
- O que ensina:
  - git pode ser o protocolo de coordenação;
  - mas falta comunicação explícita/handoff.
- Diferença para `pi-ensemble`:
  - pode complementar git coordination com mailbox/blackboard.

## 15. `openswarm-ai/openswarm`

- URL: https://github.com/openswarm-ai/openswarm
- Stars no scan: ~414
- Linguagem: JavaScript
- Modelo:
  - mission control center para swarms de agentes;
  - launch/monitor/coordinate.
- O que ensina:
  - há apetite por dashboards maiores;
  - mas a superfície pública do `pi-ensemble` deve evitar hype “swarm”.
- Diferença para `pi-ensemble`:
  - pequeno, local, auditável, apagável.

---

# Issues oficiais relevantes em Claude Code

## `anthropics/claude-code#29086`

Tema: cross-session awareness entre instâncias locais de Claude Code.

Dor descrita:

- sessões são silos;
- não sabem quem trabalha em quê;
- não compartilham contexto;
- não detectam conflito;
- handoff é manual.

Conexão direta com `pi-ensemble`:

- esse é exatamente o problema que blackboard/inbox/claims resolve.

## `anthropics/claude-code#37993`

Tema: multi-instance support para agent orchestration.

Dor descrita:

- notificações MCP roteiam para primeira instância;
- múltiplas instâncias precisam file-based workarounds;
- polling desperdiça tokens.

Conexão direta:

- `pi-ensemble` não tenta resolver routing nativo do Claude;
- assume file-based coordination como protocolo explícito e auditável.

## `anthropics/claude-code#33575`

Tema: três instâncias Claude coordenando via message queue self-hosted.

Conexão direta:

- message queue funciona, mas adiciona infra;
- `pi-ensemble` escolhe o menor denominador comum: filesystem local.

---

# O que isso informa para `pi-ensemble`

## 1. Não competir com Claude Squad / OpenSwarm

Eles são gerenciadores/mission control. `pi-ensemble` deve ser menor:

```txt
local coordination substrate, not an app shell
```

## 2. Não competir com tmux orchestrators

Tmux é adapter, não core.

Regra:

```txt
long message -> file/inbox
wake signal -> tmux/adapter opcional
```

## 3. Não spawnar agentes

Quase todos tentam spawn/stop/monitor. Isso aumenta risco e blast radius.

O diferencial:

```txt
pi-ensemble never runs commands, never starts agents, never accesses network
```

## 4. File-only é feature, não limitação

A maioria ou usa daemon, SQLite, tmux, Docker, MCP, GUI. O `pi-ensemble` deve ser:

```txt
mkdir .pi-ensemble
blackboard.md
agents/<agent>/inbox.md
audit.jsonl
worktrees.json
```

Humano pode abrir e entender tudo.

## 5. Claims de worktree/path são importantes

A paisagem confirma que git worktrees/isolamento são padrão. `pi-ensemble` não precisa criar worktrees, mas precisa registrar ownership:

```txt
ensemble claim ./path --agent claude-a
ensemble release ./path --agent claude-a
```

## 6. Pi maestro + múltiplos Claude Codes

A arquitetura recomendada para Felipe:

- **Pi maestro**: mantém memória, objetivos, decisões, publicação, auditoria e pergunta viva.
- **Claude Code worker A**: execução técnica/código real.
- **Claude Code worker B**: revisão/testes/benchmarks.
- **Claude Code worker C**: pesquisa/repos/issues/docs.
- **Codex/Pi subagents**: scouts/reviewers isolados quando couber.
- **pi-ensemble**: protocolo comum de mensagens/claims entre todos.

## 7. O nome/framing precisa fugir de hype

Evitar:

```txt
swarm
hivemind
control plane
command bus
agent orchestration platform
```

Usar:

```txt
blackboard + mailbox protocol for local coding agents
structured handoff for multi-agent coding workflows
```

---

# Relação com o scaffold atual

O scaffold atual em `/home/aya/implante/tools/pi-ensemble/` está alinhado com o benchmark:

- CLI `ensemble`;
- Pi extension;
- file-only;
- blackboard;
- inboxes;
- audit log;
- claims;
- sem spawn;
- sem rede;
- sem tmux core.

A diferença que talvez precise entrar nos docs:

1. uma página `docs/LANDSCAPE.md` com este benchmark;
2. uma tabela “not a replacement for claude-squad/multiclaude/etc.”;
3. exemplos de uso com Pi maestro + Claude workers;
4. clareza de adapters: tmux wake, watcher, dashboard são fora do core.

---

# Próximo passo sugerido

Criar no repo local:

```txt
/home/aya/implante/tools/pi-ensemble/docs/LANDSCAPE.md
```

Conteúdo curto:

- existing tools;
- what they solve;
- what pi-ensemble intentionally does not solve;
- why file-only matters.

Depois revisar `README.md` para posicionar o projeto como complemento, não concorrente.
