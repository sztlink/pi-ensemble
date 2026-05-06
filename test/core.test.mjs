import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  ack,
  claim,
  claims,
  doctor,
  done,
  init,
  messages,
  note,
  overview,
  readAudit,
  readBoard,
  readInbox,
  release,
  send,
  status,
  timeline,
} from '../lib/core.mjs';

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pi-ensemble-test-'));
}

test('init creates readable protocol files', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });

  assert.ok(fs.existsSync(path.join(root, '.pi-ensemble', 'config.yaml')));
  assert.ok(fs.existsSync(path.join(root, '.pi-ensemble', 'blackboard.md')));
  assert.ok(fs.existsSync(path.join(root, '.pi-ensemble', 'agents', 'pi', 'inbox.md')));
  const s = status(root);
  assert.equal(s.version, 1);
  assert.equal(s.agents.find(a => a.agent === 'pi')?.pending, 0);
});

test('send writes typed inbox message and readInbox can archive/clear', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  send(root, { from: 'pi', to: 'claude-a', type: 'question', body: 'Review this.' });

  const before = readInbox(root, { agent: 'claude-a', clear: false });
  assert.match(before, /pi → claude-a \[question\]/);
  assert.match(before, /Review this\./);

  const cleared = readInbox(root, { agent: 'claude-a', clear: true });
  assert.match(cleared, /Review this\./);
  assert.equal(status(root).agents.find(a => a.agent === 'claude-a')?.pending, 0);
  assert.ok(fs.existsSync(path.join(root, '.pi-ensemble', 'agents', 'claude-a', 'inbox.read.md')));
});

test('readBoard and note recreate missing blackboard', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  fs.rmSync(path.join(root, '.pi-ensemble', 'blackboard.md'));

  assert.match(readBoard(root), /pi-ensemble blackboard/);
  note(root, { from: 'pi', body: 'durable fact' });
  assert.match(readBoard(root), /durable fact/);
});

test('agent names and message types are validated', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });

  assert.throws(() => send(root, { from: 'bad/name', to: 'claude', body: 'x' }), /Invalid agent name/);
  assert.throws(() => send(root, { from: 'pi', to: 'claude', type: 'oops', body: 'x' }), /Invalid type/);
});

test('claim prevents accidental ownership overwrite unless forced', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });

  const first = claim(root, { agent: 'pi', targetPath: 'src/foo.ts' });
  assert.equal(first.action, 'claim');
  assert.throws(() => claim(root, { agent: 'claude', targetPath: 'src/foo.ts' }), /already claimed by pi/);

  const forced = claim(root, { agent: 'claude', targetPath: 'src/foo.ts', force: true });
  assert.equal(forced.action, 'claim_update');
  assert.equal(forced.previous.agent, 'pi');

  assert.throws(() => release(root, { agent: 'pi', targetPath: 'src/foo.ts' }), /claimed by claude/);
  assert.equal(claims(root)[path.resolve(root, 'src/foo.ts')].agent, 'claude');

  const released = release(root, { agent: 'claude', targetPath: 'src/foo.ts' });
  assert.equal(released.previous.agent, 'claude');
});

test('readAudit returns parsed audit records with limit', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  note(root, { from: 'pi', body: 'one' });
  send(root, { from: 'pi', to: 'claude', body: 'two' });

  const records = readAudit(root, { limit: 2 });
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(r => r.action), ['note', 'send']);
});

test('overview and timeline provide read-only inspection shapes', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  send(root, { from: 'pi', to: 'claude', body: 'please inspect' });
  claim(root, { agent: 'pi', targetPath: 'docs' });

  const o = overview(root, { limit: 3 });
  assert.equal(o.pending[0].agent, 'claude');
  assert.equal(o.unread[0].agent, 'claude');
  assert.equal(o.claims[0].agent, 'pi');
  assert.ok(o.recent.length <= 3);

  const rows = timeline(root, { limit: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'claim');
  assert.match(rows[0].summary, /claimed/);
});

test('non-clearing inbox reads mark unread messages as retained stale messages', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  send(root, { from: 'pi', to: 'claude', body: 'first' });

  const first = overview(root);
  assert.equal(first.agents.find(a => a.agent === 'claude')?.pending, 1);
  assert.equal(first.agents.find(a => a.agent === 'claude')?.unread, 1);

  const read = readInbox(root, { agent: 'claude', clear: false });
  assert.match(read, /first/);

  const afterRead = overview(root);
  const claude = afterRead.agents.find(a => a.agent === 'claude');
  assert.equal(claude?.pending, 1);
  assert.equal(claude?.unread, 0);
  assert.equal(claude?.stale, 1);
  assert.equal(afterRead.unread.length, 0);
  assert.equal(afterRead.stale[0].agent, 'claude');
});

test('sinceLastRead inbox returns only new messages without clearing retained history', async () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  send(root, { from: 'pi', to: 'claude', body: 'old' });
  readInbox(root, { agent: 'claude', clear: false });
  await new Promise(resolve => setTimeout(resolve, 5));
  send(root, { from: 'pi', to: 'claude', body: 'new' });

  const unread = readInbox(root, { agent: 'claude', clear: false, sinceLastRead: true });
  assert.doesNotMatch(unread, /old/);
  assert.match(unread, /new/);

  const after = overview(root).agents.find(a => a.agent === 'claude');
  assert.equal(after?.pending, 2);
  assert.equal(after?.unread, 0);
  assert.equal(after?.stale, 2);
});

test('overview can infer last read from legacy audit records', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  send(root, { from: 'pi', to: 'claude', body: 'old' });
  readInbox(root, { agent: 'claude', clear: false });

  const stateFile = path.join(root, '.pi-ensemble', 'agents', 'claude', 'state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  delete state.lastReadAt;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');

  const claude = overview(root).agents.find(a => a.agent === 'claude');
  assert.equal(claude?.pending, 1);
  assert.equal(claude?.unread, 0);
  assert.equal(claude?.stale, 1);
  assert.ok(claude?.lastReadAt);
});

test('doctor reports ledger health and nested ledgers', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  fs.mkdirSync(path.join(root, 'tools', 'child', '.pi-ensemble'), { recursive: true });
  fs.appendFileSync(path.join(root, '.pi-ensemble', 'audit.jsonl'), 'not-json\n');

  const report = doctor(root);
  assert.equal(report.ok, true);
  assert.equal(report.checks.find(c => c.name === 'root')?.status, 'pass');
  assert.equal(report.checks.find(c => c.name === 'nested-ledgers')?.status, 'warn');
  assert.equal(report.checks.find(c => c.name === 'audit-jsonl')?.status, 'warn');
});

test('messages get ids and can be acked and resolved through audit events', () => {
  const root = tempRoot();
  init(root, { agent: 'pi' });
  const sent = send(root, { from: 'pi', to: 'claude', type: 'question', body: 'Can you check this?' });
  assert.match(sent.messageId, /^msg_/);

  const inbox = readInbox(root, { agent: 'claude', clear: false });
  assert.match(inbox, new RegExp(`\\{#${sent.messageId}\\}`));

  ack(root, { from: 'claude', messageId: sent.messageId, body: 'received' });
  assert.equal(messages(root, { open: true })[0].status, 'acked');
  assert.equal(overview(root).openMessages[0].messageId, sent.messageId);

  done(root, { from: 'pi', messageId: sent.messageId, body: 'closed' });
  assert.equal(messages(root)[0].status, 'done');
  assert.equal(messages(root, { open: true }).length, 0);
});
