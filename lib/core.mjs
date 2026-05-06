import fs from 'node:fs';
import path from 'node:path';

export const PROTOCOL_VERSION = 1;
export const MESSAGE_TYPES = new Set(['note', 'handoff', 'question', 'result', 'ack']);
export const AGENT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function nowIso() {
  return new Date().toISOString();
}

export function defaultAgent() {
  const agent = process.env.PI_ENSEMBLE_AGENT || process.env.USER || 'agent';
  return AGENT_NAME_PATTERN.test(agent) ? agent : 'agent';
}

export function validateAgentName(agent) {
  if (!agent || typeof agent !== 'string') throw new Error('agent name is required');
  if (!AGENT_NAME_PATTERN.test(agent)) {
    throw new Error(`Invalid agent name: ${agent}. Use 1-64 chars: letters, numbers, dot, underscore, hyphen.`);
  }
  return agent;
}

export function validateMessageType(type) {
  if (!MESSAGE_TYPES.has(type)) throw new Error(`Invalid type: ${type}`);
  return type;
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
  validateAgentName(agent);
  const base = ensembleDir(root);
  ensureDir(base);
  ensureDir(path.join(base, 'agents', agent));
  writeIfMissing(path.join(base, 'config.yaml'), `version: ${PROTOCOL_VERSION}\ndefault_agent: ${agent}\n`);
  writeIfMissing(path.join(base, 'blackboard.md'), '# pi-ensemble blackboard\n\nAppend-only shared notes for local coding agents.\n');
  writeIfMissing(path.join(base, 'worktrees.json'), '{}\n');
  writeIfMissing(path.join(base, 'audit.jsonl'), '');
  writeIfMissing(path.join(base, 'agents', agent, 'inbox.md'), `# inbox: ${agent}\n\n`);
  writeIfMissing(path.join(base, 'agents', agent, 'state.json'), JSON.stringify({ status: 'idle', task: null, since: nowIso() }, null, 2) + '\n');
  audit(root, { action: 'init', actor: agent, root });
  return { root, dir: base, agent };
}

export function ensureAgent(root, agent) {
  validateAgentName(agent);
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
  validateAgentName(from);
  if (!body?.trim()) throw new Error('note body is required');
  append(ensureBlackboard(root), messageBlock({ from, type: 'note', body }));
  return audit(root, { action: 'note', from, type: 'note', body });
}

export function send(root, { from = defaultAgent(), to, type = 'handoff', body }) {
  validateAgentName(from);
  validateAgentName(to);
  validateMessageType(type);
  if (!body?.trim()) throw new Error('message body is required');
  ensureAgent(root, to);
  append(path.join(ensembleDir(root), 'agents', to, 'inbox.md'), messageBlock({ from, to, type, body }));
  return audit(root, { action: 'send', from, to, type, body });
}

export function readInbox(root, { agent = defaultAgent(), clear = true } = {}) {
  validateAgentName(agent);
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

export function claims(root) {
  const file = path.join(ensembleDir(root), 'worktrees.json');
  audit(root, { action: 'claims_read' });
  return readJson(file, {});
}

export function readAudit(root, { limit = 50 } = {}) {
  const file = path.join(ensembleDir(root), 'audit.jsonl');
  writeIfMissing(file, '');
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const selected = limit > 0 ? lines.slice(-limit) : lines;
  return selected.map(line => {
    try { return JSON.parse(line); }
    catch { return { malformed: true, line }; }
  });
}

export function status(root) {
  const base = ensembleDir(root);
  const agentsRoot = path.join(base, 'agents');
  const agents = fs.existsSync(agentsRoot)
    ? fs.readdirSync(agentsRoot, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    : [];
  const config = readConfig(path.join(base, 'config.yaml'));
  const worktrees = readJson(path.join(base, 'worktrees.json'), {});
  const rows = agents.map(agent => {
    ensureAgent(root, agent);
    const inbox = fs.readFileSync(path.join(agentsRoot, agent, 'inbox.md'), 'utf8');
    const pending = (inbox.match(/^## /gm) || []).length;
    const state = readJson(path.join(agentsRoot, agent, 'state.json'), {});
    return { agent, pending, state };
  });
  audit(root, { action: 'status' });
  return { root, version: config.version ?? PROTOCOL_VERSION, agents: rows, worktrees };
}

function readConfig(file) {
  const out = {};
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) continue;
      const value = match[2]?.trim() ?? '';
      out[match[1]] = /^\d+$/.test(value) ? Number(value) : value;
    }
  } catch {}
  return out;
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || 'null') ?? fallback; }
  catch { return fallback; }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
}

export function claim(root, { agent = defaultAgent(), targetPath, force = false } = {}) {
  validateAgentName(agent);
  if (!targetPath?.trim()) throw new Error('path is required');
  const file = path.join(ensembleDir(root), 'worktrees.json');
  const worktrees = readJson(file, {});
  const resolved = path.resolve(root, targetPath);
  const previous = worktrees[resolved];
  if (previous?.agent && previous.agent !== agent && !force) {
    throw new Error(`Path already claimed by ${previous.agent}: ${resolved}. Use --force to override.`);
  }
  worktrees[resolved] = { agent, since: nowIso(), previous: force ? previous : undefined };
  if (worktrees[resolved].previous === undefined) delete worktrees[resolved].previous;
  writeJson(file, worktrees);
  return audit(root, { action: previous ? 'claim_update' : 'claim', agent, path: resolved, previous, force });
}

export function release(root, { agent = defaultAgent(), targetPath, force = false } = {}) {
  validateAgentName(agent);
  if (!targetPath?.trim()) throw new Error('path is required');
  const file = path.join(ensembleDir(root), 'worktrees.json');
  const worktrees = readJson(file, {});
  const resolved = path.resolve(root, targetPath);
  const previous = worktrees[resolved];
  if (previous?.agent && previous.agent !== agent && !force) {
    throw new Error(`Path claimed by ${previous.agent}, not ${agent}: ${resolved}. Use --force to release anyway.`);
  }
  delete worktrees[resolved];
  writeJson(file, worktrees);
  return audit(root, { action: 'release', agent, path: resolved, previous, force });
}
