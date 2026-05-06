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

function agentStateFile(root, agent) {
  return path.join(ensembleDir(root), 'agents', agent, 'state.json');
}

function readAgentState(root, agent) {
  return readJson(agentStateFile(root, agent), {});
}

function writeAgentState(root, agent, patch) {
  const current = readAgentState(root, agent);
  const next = { ...current, ...patch };
  writeJson(agentStateFile(root, agent), next);
  return next;
}

function parseInboxMessages(content) {
  const lines = content.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^## ([0-9]{4}-[0-9]{2}-[0-9]{2}T[^ ]+) — /);
    if (match) starts.push({ index: i, ts: match[1] });
  }
  return starts.map((start, idx) => {
    const end = starts[idx + 1]?.index ?? lines.length;
    return { ts: start.ts, block: lines.slice(start.index, end).join('\n').trimEnd() };
  });
}

function inboxHeader(agent) {
  return `# inbox: ${agent}\n\n`;
}

function inboxSince(content, agent, since) {
  if (!since) return content;
  const sinceMs = Date.parse(since);
  if (!Number.isFinite(sinceMs)) return content;
  const messages = parseInboxMessages(content).filter(message => Date.parse(message.ts) > sinceMs);
  return inboxHeader(agent) + (messages.length ? `\n${messages.map(m => m.block).join('\n\n')}\n` : '');
}

function latestInboxReadAt(root, agent) {
  const file = path.join(ensembleDir(root), 'audit.jsonl');
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const record = JSON.parse(lines[i]);
      if ((record.action === 'inbox_read' || record.action === 'inbox_clear') && record.agent === agent) return record.ts;
    }
  } catch {}
  return null;
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

export function readInbox(root, { agent = defaultAgent(), clear = true, sinceLastRead = false } = {}) {
  validateAgentName(agent);
  ensureAgent(root, agent);
  const file = path.join(ensembleDir(root), 'agents', agent, 'inbox.md');
  const content = fs.readFileSync(file, 'utf8');
  const state = readAgentState(root, agent);
  const lastReadAt = state.lastReadAt || latestInboxReadAt(root, agent);
  const visible = sinceLastRead ? inboxSince(content, agent, lastReadAt) : content;
  const readAt = nowIso();
  writeAgentState(root, agent, { lastReadAt: readAt });
  if (clear) {
    const archive = path.join(ensembleDir(root), 'agents', agent, 'inbox.read.md');
    append(archive, `\n<!-- cleared ${readAt} -->\n${content}\n`);
    fs.writeFileSync(file, inboxHeader(agent), { encoding: 'utf8', mode: 0o600 });
    audit(root, { action: 'inbox_clear', agent, sinceLastRead });
  } else {
    audit(root, { action: 'inbox_read', agent, sinceLastRead });
  }
  return visible;
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

function workspaceStatus(root) {
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
    const messages = parseInboxMessages(inbox);
    const pending = messages.length;
    const state = readAgentState(root, agent);
    const lastReadAt = state.lastReadAt || latestInboxReadAt(root, agent);
    const lastReadMs = Date.parse(lastReadAt || '');
    const unread = Number.isFinite(lastReadMs)
      ? messages.filter(message => Date.parse(message.ts) > lastReadMs).length
      : pending;
    const stale = Math.max(0, pending - unread);
    return {
      agent,
      pending,
      unread,
      stale,
      lastReadAt: lastReadAt || null,
      oldestPendingAt: messages[0]?.ts || null,
      newestPendingAt: messages[messages.length - 1]?.ts || null,
      state,
    };
  });
  return { root, version: config.version ?? PROTOCOL_VERSION, agents: rows, worktrees };
}

export function status(root) {
  const result = workspaceStatus(root);
  audit(root, { action: 'status' });
  return result;
}

export function overview(root, { limit = 10 } = {}) {
  const current = workspaceStatus(root);
  const pending = current.agents.filter(agent => agent.pending > 0);
  const unread = current.agents.filter(agent => agent.unread > 0);
  const stale = current.agents.filter(agent => agent.stale > 0);
  const claimEntries = Object.entries(current.worktrees).map(([targetPath, owner]) => ({ path: targetPath, ...owner }));
  return {
    root: current.root,
    version: current.version,
    agents: current.agents,
    pending,
    unread,
    stale,
    claims: claimEntries,
    recent: timeline(root, { limit }),
  };
}

export function doctor(root, { nestedDepth = 4 } = {}) {
  const checks = [];
  const add = (name, status, message, details = undefined) => checks.push({ name, status, message, ...(details === undefined ? {} : { details }) });
  const base = ensembleDir(root);
  const required = ['config.yaml', 'blackboard.md', 'worktrees.json', 'audit.jsonl'];

  add('root', fs.existsSync(base) ? 'pass' : 'fail', fs.existsSync(base) ? `.pi-ensemble found at ${base}` : `.pi-ensemble missing at ${base}`);
  for (const file of required) {
    const full = path.join(base, file);
    add(`file:${file}`, fs.existsSync(full) ? 'pass' : 'fail', fs.existsSync(full) ? `${file} exists` : `${file} is missing`);
  }

  const config = readConfig(path.join(base, 'config.yaml'));
  const configVersion = config.version ?? null;
  add('protocol-version', configVersion === PROTOCOL_VERSION ? 'pass' : 'warn', `config version=${configVersion ?? 'missing'} expected=${PROTOCOL_VERSION}`);

  const auditIssues = auditParseIssues(path.join(base, 'audit.jsonl'));
  add('audit-jsonl', auditIssues.length ? 'warn' : 'pass', auditIssues.length ? `${auditIssues.length} malformed audit line(s)` : 'audit log parses cleanly', auditIssues.length ? auditIssues.slice(0, 5) : undefined);

  const current = workspaceStatus(root);
  const invalidAgents = current.agents.filter(a => !AGENT_NAME_PATTERN.test(a.agent)).map(a => a.agent);
  add('agents', invalidAgents.length ? 'fail' : 'pass', invalidAgents.length ? `invalid agent names: ${invalidAgents.join(', ')}` : `${current.agents.length} agent(s) registered`);

  const unread = current.agents.filter(a => a.unread > 0).map(a => ({ agent: a.agent, unread: a.unread }));
  add('inbox-unread', unread.length ? 'info' : 'pass', unread.length ? `${unread.length} agent(s) have unread inbox items` : 'no unread inbox items', unread.length ? unread : undefined);

  const stale = current.agents.filter(a => a.stale > 0).map(a => ({ agent: a.agent, stale: a.stale }));
  add('inbox-retained', stale.length ? 'info' : 'pass', stale.length ? `${stale.length} agent(s) retain already-read inbox history` : 'no retained read inbox items', stale.length ? stale : undefined);

  const claimsList = Object.entries(current.worktrees).map(([targetPath, owner]) => ({ path: targetPath, ...owner }));
  const brokenClaims = claimsList.filter(c => !c.agent || !AGENT_NAME_PATTERN.test(c.agent) || !fs.existsSync(c.path));
  add('claims', brokenClaims.length ? 'warn' : 'pass', brokenClaims.length ? `${brokenClaims.length} claim(s) need attention` : `${claimsList.length} active claim(s) look valid`, brokenClaims.length ? brokenClaims : undefined);

  const nested = findNestedEnsembleDirs(root, { maxDepth: nestedDepth }).filter(dir => path.resolve(dir) !== path.resolve(base));
  add('nested-ledgers', nested.length ? 'warn' : 'pass', nested.length ? `${nested.length} nested .pi-ensemble folder(s) found` : 'no nested .pi-ensemble folders found', nested.length ? nested : undefined);

  audit(root, { action: 'doctor', ok: !checks.some(c => c.status === 'fail') });
  return {
    root,
    ok: !checks.some(c => c.status === 'fail'),
    summary: {
      pass: checks.filter(c => c.status === 'pass').length,
      info: checks.filter(c => c.status === 'info').length,
      warn: checks.filter(c => c.status === 'warn').length,
      fail: checks.filter(c => c.status === 'fail').length,
    },
    checks,
  };
}

export function timeline(root, { limit = 50 } = {}) {
  return readAudit(root, { limit }).map(record => ({
    ts: record.ts,
    action: record.action,
    summary: summarizeAuditRecord(record),
    record,
  }));
}

function summarizeAuditRecord(record) {
  if (record.malformed) return 'malformed audit record';
  if (record.action === 'send') return `${record.from} → ${record.to} [${record.type}] ${short(record.body)}`;
  if (record.action === 'note') return `${record.from} noted ${short(record.body)}`;
  if (record.action === 'claim' || record.action === 'claim_update') return `${record.agent} claimed ${record.path}`;
  if (record.action === 'release') return `${record.agent} released ${record.path}`;
  if (record.action === 'inbox_clear') return `${record.agent} cleared inbox`;
  if (record.action === 'inbox_read') return `${record.agent} read inbox`;
  if (record.action === 'init') return `${record.actor} initialized ${record.root}`;
  return record.action || 'unknown';
}

function short(value, max = 96) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
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

function auditParseIssues(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').flatMap((line, index) => {
      if (!line.trim()) return [];
      try { JSON.parse(line); return []; }
      catch (err) { return [{ line: index + 1, error: err instanceof Error ? err.message : String(err) }]; }
    });
  } catch {
    return [];
  }
}

function findNestedEnsembleDirs(root, { maxDepth = 4 } = {}) {
  const found = [];
  const skip = new Set(['.git', 'node_modules', '.cache', 'dist', 'build']);
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === '.pi-ensemble') {
        found.push(path.join(dir, entry.name));
        continue;
      }
      if (skip.has(entry.name)) continue;
      walk(path.join(dir, entry.name), depth + 1);
    }
  }
  walk(root, 0);
  return found;
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
