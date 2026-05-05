import fs from 'node:fs';
import path from 'node:path';

export const MESSAGE_TYPES = new Set(['note', 'handoff', 'question', 'result', 'ack']);

export function nowIso() {
  return new Date().toISOString();
}

export function defaultAgent() {
  return process.env.PI_ENSEMBLE_AGENT || process.env.USER || 'agent';
}

export function findWorkspaceRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, '.pi-ensemble'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function requireWorkspaceRoot(start = process.cwd()) {
  const root = findWorkspaceRoot(start);
  if (!root) throw new Error('No .pi-ensemble/ found. Run `ensemble init` first.');
  return root;
}

export function ensembleDir(root) {
  return path.join(root, '.pi-ensemble');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true, mode: 0o700 });
}

function writeIfMissing(file, content) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, content, { encoding: 'utf8', mode: 0o600 });
}

function append(file, content) {
  fs.appendFileSync(file, content, { encoding: 'utf8', mode: 0o600 });
}

export function init(root = process.cwd(), { agent = defaultAgent() } = {}) {
  const base = ensembleDir(root);
  ensureDir(base);
  ensureDir(path.join(base, 'agents', agent));
  writeIfMissing(path.join(base, 'config.yaml'), `version: 1\ndefault_agent: ${agent}\n`);
  writeIfMissing(path.join(base, 'blackboard.md'), '# pi-ensemble blackboard\n\nAppend-only shared notes for local coding agents.\n');
  writeIfMissing(path.join(base, 'worktrees.json'), '{}\n');
  writeIfMissing(path.join(base, 'audit.jsonl'), '');
  writeIfMissing(path.join(base, 'agents', agent, 'inbox.md'), `# inbox: ${agent}\n\n`);
  writeIfMissing(path.join(base, 'agents', agent, 'state.json'), JSON.stringify({ status: 'idle', task: null, since: nowIso() }, null, 2) + '\n');
  audit(root, { action: 'init', actor: agent, root });
  return { root, dir: base, agent };
}

export function ensureAgent(root, agent) {
  const dir = path.join(ensembleDir(root), 'agents', agent);
  ensureDir(dir);
  writeIfMissing(path.join(dir, 'inbox.md'), `# inbox: ${agent}\n\n`);
  writeIfMissing(path.join(dir, 'state.json'), JSON.stringify({ status: 'idle', task: null, since: nowIso() }, null, 2) + '\n');
  return dir;
}

export function ensureBlackboard(root) {
  const file = path.join(ensembleDir(root), 'blackboard.md');
  writeIfMissing(file, '# pi-ensemble blackboard\n\nAppend-only shared notes for local coding agents.\n');
  return file;
}

export function audit(root, event) {
  const record = { ts: nowIso(), ...event };
  append(path.join(ensembleDir(root), 'audit.jsonl'), JSON.stringify(record) + '\n');
  return record;
}

function messageBlock({ from, to, type, body }) {
  const header = to ? `${from} → ${to}` : from;
  return `\n## ${nowIso()} — ${header} [${type}]\n\n${body.trim()}\n`;
}

export function note(root, { from = defaultAgent(), body }) {
  if (!body?.trim()) throw new Error('note body is required');
  append(path.join(ensembleDir(root), 'blackboard.md'), messageBlock({ from, type: 'note', body }));
  return audit(root, { action: 'note', from, type: 'note', body });
}

export function send(root, { from = defaultAgent(), to, type = 'handoff', body }) {
  if (!to) throw new Error('target agent is required');
  if (!body?.trim()) throw new Error('message body is required');
  if (!MESSAGE_TYPES.has(type)) throw new Error(`Invalid type: ${type}`);
  ensureAgent(root, to);
  append(path.join(ensembleDir(root), 'agents', to, 'inbox.md'), messageBlock({ from, to, type, body }));
  return audit(root, { action: 'send', from, to, type, body });
}

export function readInbox(root, { agent = defaultAgent(), clear = true } = {}) {
  ensureAgent(root, agent);
  const file = path.join(ensembleDir(root), 'agents', agent, 'inbox.md');
  const content = fs.readFileSync(file, 'utf8');
  if (clear) {
    const archive = path.join(ensembleDir(root), 'agents', agent, 'inbox.read.md');
    append(archive, `\n<!-- cleared ${nowIso()} -->\n${content}\n`);
    fs.writeFileSync(file, `# inbox: ${agent}\n\n`, { encoding: 'utf8', mode: 0o600 });
    audit(root, { action: 'inbox_clear', agent });
  } else {
    audit(root, { action: 'inbox_read', agent });
  }
  return content;
}

export function readBoard(root) {
  const file = ensureBlackboard(root);
  audit(root, { action: 'board_read' });
  return fs.readFileSync(file, 'utf8');
}

export function status(root) {
  const base = ensembleDir(root);
  const agentsRoot = path.join(base, 'agents');
  const agents = fs.existsSync(agentsRoot)
    ? fs.readdirSync(agentsRoot, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    : [];
  const worktrees = readJson(path.join(base, 'worktrees.json'), {});
  const rows = agents.map(agent => {
    const inbox = fs.readFileSync(path.join(agentsRoot, agent, 'inbox.md'), 'utf8');
    const pending = (inbox.match(/^## /gm) || []).length;
    const state = readJson(path.join(agentsRoot, agent, 'state.json'), {});
    return { agent, pending, state };
  });
  audit(root, { action: 'status' });
  return { root, agents: rows, worktrees };
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || 'null') ?? fallback; }
  catch { return fallback; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
}

export function claim(root, { agent = defaultAgent(), targetPath }) {
  if (!targetPath) throw new Error('path is required');
  const file = path.join(ensembleDir(root), 'worktrees.json');
  const worktrees = readJson(file, {});
  const resolved = path.resolve(root, targetPath);
  worktrees[resolved] = { agent, since: nowIso() };
  writeJson(file, worktrees);
  return audit(root, { action: 'claim', agent, path: resolved });
}

export function release(root, { agent = defaultAgent(), targetPath }) {
  if (!targetPath) throw new Error('path is required');
  const file = path.join(ensembleDir(root), 'worktrees.json');
  const worktrees = readJson(file, {});
  const resolved = path.resolve(root, targetPath);
  const previous = worktrees[resolved];
  delete worktrees[resolved];
  writeJson(file, worktrees);
  return audit(root, { action: 'release', agent, path: resolved, previous });
}
