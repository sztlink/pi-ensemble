import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  claim,
  claims,
  init,
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
  assert.equal(o.claims[0].agent, 'pi');
  assert.ok(o.recent.length <= 3);

  const rows = timeline(root, { limit: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, 'claim');
  assert.match(rows[0].summary, /claimed/);
});
