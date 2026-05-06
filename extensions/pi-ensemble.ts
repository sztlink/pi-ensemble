import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import {
  claim,
  claims,
  defaultAgent,
  init,
  note,
  overview,
  readAudit,
  readBoard,
  readInbox,
  release,
  requireWorkspaceRoot,
  send,
  status,
  timeline,
} from "../lib/core.mjs";

const MessageType = StringEnum(["note", "handoff", "question", "result", "ack"] as const);
const ActionType = StringEnum(["init", "status", "note", "send", "inbox", "board", "claims", "audit", "timeline", "overview", "claim", "release"] as const);

function parseArgs(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[0]);
  return out;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function takeFlag(argv: string[], name: string, fallback?: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const value = argv[i + 1];
  argv.splice(i, 2);
  return value ?? fallback;
}

function rootFromCwd(ctx: { cwd: string }, explicitRoot?: string) {
  return requireWorkspaceRoot(explicitRoot || process.env.PI_ENSEMBLE_ROOT || ctx.cwd);
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("ensemble", {
    description: "Local blackboard/mailbox for parallel coding agents",
    handler: async (args, ctx) => {
      const argv = parseArgs(args || "");
      let explicitRoot = takeFlag(argv, "--root", undefined);
      const cmd = argv.shift() || "status";
      if (!explicitRoot) explicitRoot = takeFlag(argv, "--root", undefined);
      try {
        if (cmd === "init") {
          const agent = argv[0] || defaultAgent();
          const r = init(explicitRoot || process.env.PI_ENSEMBLE_ROOT || ctx.cwd, { agent });
          ctx.ui.notify(`pi-ensemble initialized: ${r.dir}`, "success");
          return;
        }
        if (cmd === "status") {
          ctx.ui.notify(asText(status(rootFromCwd(ctx, explicitRoot))), "info");
          return;
        }
        if (cmd === "note") {
          note(rootFromCwd(ctx, explicitRoot), { from: defaultAgent(), body: argv.join(" ") });
          ctx.ui.notify("pi-ensemble note added", "success");
          return;
        }
        if (cmd === "send") {
          const type = takeFlag(argv, "--type", "handoff") as "note" | "handoff" | "question" | "result" | "ack";
          const to = argv.shift();
          send(rootFromCwd(ctx, explicitRoot), { from: defaultAgent(), to, type, body: argv.join(" ") });
          ctx.ui.notify(`pi-ensemble sent to ${to}`, "success");
          return;
        }
        if (cmd === "inbox") {
          const content = readInbox(rootFromCwd(ctx, explicitRoot), { agent: argv[0] || defaultAgent(), clear: true });
          ctx.ui.notify(content || "Inbox empty", "info");
          return;
        }
        if (cmd === "board") {
          ctx.ui.notify(readBoard(rootFromCwd(ctx, explicitRoot)), "info");
          return;
        }
        if (cmd === "claims") {
          ctx.ui.notify(asText(claims(rootFromCwd(ctx, explicitRoot))), "info");
          return;
        }
        if (cmd === "audit") {
          const limit = Number(takeFlag(argv, "--limit", "50"));
          ctx.ui.notify(asText(readAudit(rootFromCwd(ctx, explicitRoot), { limit: Number.isFinite(limit) ? limit : 50 })), "info");
          return;
        }
        if (cmd === "timeline") {
          const limit = Number(takeFlag(argv, "--limit", "50"));
          ctx.ui.notify(asText(timeline(rootFromCwd(ctx, explicitRoot), { limit: Number.isFinite(limit) ? limit : 50 })), "info");
          return;
        }
        if (cmd === "overview") {
          const limit = Number(takeFlag(argv, "--limit", "10"));
          ctx.ui.notify(asText(overview(rootFromCwd(ctx, explicitRoot), { limit: Number.isFinite(limit) ? limit : 10 })), "info");
          return;
        }
        if (cmd === "claim") {
          claim(rootFromCwd(ctx, explicitRoot), { agent: defaultAgent(), targetPath: argv.join(" ") });
          ctx.ui.notify("pi-ensemble path claimed", "success");
          return;
        }
        if (cmd === "release") {
          release(rootFromCwd(ctx, explicitRoot), { agent: defaultAgent(), targetPath: argv.join(" ") });
          ctx.ui.notify("pi-ensemble path released", "success");
          return;
        }
        ctx.ui.notify("Usage: /ensemble init|status|note|send|inbox|board|claims|audit|timeline|overview|claim|release", "warning");
      } catch (err) {
        ctx.ui.notify(err instanceof Error ? err.message : String(err), "error");
      }
    },
  });

  pi.registerTool({
    name: "ensemble",
    label: "Ensemble",
    description: "Read/write local .pi-ensemble blackboard, inboxes, and worktree claims. File-only: no network, no process spawning, no code execution.",
    promptSnippet: "Coordinate with local coding agents via .pi-ensemble blackboard and inbox files",
    promptGuidelines: [
      "Use ensemble only for local coding-agent coordination inside a repository that has .pi-ensemble initialized.",
      "Never put credentials, tokens, cookies, or private secrets into ensemble messages.",
      "ensemble does not spawn agents, run commands, access the network, or wake remote sessions.",
    ],
    parameters: Type.Object({
      action: ActionType,
      agent: Type.Optional(Type.String({ description: "Current/local agent name" })),
      to: Type.Optional(Type.String({ description: "Target agent for send" })),
      type: Type.Optional(MessageType),
      body: Type.Optional(Type.String({ description: "Message body" })),
      path: Type.Optional(Type.String({ description: "Path to claim or release" })),
      clear: Type.Optional(Type.Boolean({ description: "Clear inbox after reading", default: true })),
      force: Type.Optional(Type.Boolean({ description: "Override claim ownership conflicts", default: false })),
      limit: Type.Optional(Type.Number({ description: "Maximum audit records to return", default: 50 })),
      root: Type.Optional(Type.String({ description: "Workspace root or descendant containing .pi-ensemble" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      try {
        const agent = params.agent || defaultAgent();
        if (params.action === "init") {
          const result = init(params.root || process.env.PI_ENSEMBLE_ROOT || ctx.cwd, { agent });
          return { content: [{ type: "text", text: `Initialized ${result.dir}` }], details: result };
        }
        const root = rootFromCwd(ctx, params.root);
        let result: unknown;
        if (params.action === "status") result = status(root);
        else if (params.action === "note") result = note(root, { from: agent, body: params.body || "" });
        else if (params.action === "send") result = send(root, { from: agent, to: params.to, type: params.type || "handoff", body: params.body || "" });
        else if (params.action === "inbox") result = readInbox(root, { agent, clear: params.clear !== false });
        else if (params.action === "board") result = readBoard(root);
        else if (params.action === "claims") result = claims(root);
        else if (params.action === "audit") result = readAudit(root, { limit: params.limit ?? 50 });
        else if (params.action === "timeline") result = timeline(root, { limit: params.limit ?? 50 });
        else if (params.action === "overview") result = overview(root, { limit: params.limit ?? 10 });
        else if (params.action === "claim") result = claim(root, { agent, targetPath: params.path, force: params.force === true });
        else if (params.action === "release") result = release(root, { agent, targetPath: params.path, force: params.force === true });
        return { content: [{ type: "text", text: asText(result) }], details: { result } };
      } catch (err) {
        return { content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }], isError: true };
      }
    },
  });
}
