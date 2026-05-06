#!/usr/bin/env node
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
} from '../lib/core.mjs';

function usage() {
  console.log(`pi-ensemble

Usage:
  ensemble init [--agent NAME]
  ensemble status
  ensemble note MESSAGE [--from NAME] [--json]
  ensemble send AGENT MESSAGE [--from NAME] [--type note|handoff|question|result|ack] [--json]
  ensemble inbox [--agent NAME] [--no-clear] [--json]
  ensemble board [--json]
  ensemble claims [--json]
  ensemble audit [--limit N] [--json]
  ensemble timeline [--limit N] [--json]
  ensemble overview [--limit N] [--json]
  ensemble claim PATH [--agent NAME] [--force] [--json]
  ensemble release PATH [--agent NAME] [--force] [--json]
`);
}

function takeFlag(args, name, fallback = undefined) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value ?? fallback;
}

function hasFlag(args, name) {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

function root() {
  return requireWorkspaceRoot(process.cwd());
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function formatTimeline(rows) {
  return rows.map(row => `${row.ts ?? '?'} ${row.action ?? '?'} — ${row.summary}`).join('\n') + (rows.length ? '\n' : '');
}

function formatOverview(value) {
  const lines = [];
  lines.push(`root: ${value.root}`);
  lines.push(`version: ${value.version}`);
  lines.push(`agents: ${value.agents.map(a => `${a.agent}(${a.pending})`).join(', ') || 'none'}`);
  lines.push(`pending: ${value.pending.map(a => a.agent).join(', ') || 'none'}`);
  lines.push(`claims: ${value.claims.length}`);
  for (const claim of value.claims) lines.push(`  - ${claim.agent}: ${claim.path}`);
  lines.push('recent:');
  for (const row of value.recent) lines.push(`  - ${row.ts ?? '?'} ${row.action ?? '?'} — ${row.summary}`);
  return lines.join('\n') + '\n';
}

try {
  const args = process.argv.slice(2);
  const cmd = args.shift() || 'help';
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
  } else if (cmd === 'init') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const r = init(process.cwd(), { agent });
    console.log(`initialized ${r.dir} (agent: ${r.agent})`);
  } else if (cmd === 'status') {
    const s = status(root());
    printJson(s);
  } else if (cmd === 'note') {
    const from = takeFlag(args, '--from', defaultAgent());
    const json = hasFlag(args, '--json');
    const body = args.join(' ');
    const result = note(root(), { from, body });
    json ? printJson(result) : console.log('noted');
  } else if (cmd === 'send') {
    const from = takeFlag(args, '--from', defaultAgent());
    const type = takeFlag(args, '--type', 'handoff');
    const json = hasFlag(args, '--json');
    const to = args.shift();
    const body = args.join(' ');
    const result = send(root(), { from, to, type, body });
    json ? printJson(result) : console.log(`sent to ${to}`);
  } else if (cmd === 'inbox') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const noClear = hasFlag(args, '--no-clear');
    const json = hasFlag(args, '--json');
    const content = readInbox(root(), { agent, clear: !noClear });
    json ? printJson({ agent, clear: !noClear, content }) : process.stdout.write(content);
  } else if (cmd === 'board') {
    const json = hasFlag(args, '--json');
    const content = readBoard(root());
    json ? printJson({ content }) : process.stdout.write(content);
  } else if (cmd === 'claims') {
    const json = hasFlag(args, '--json');
    const result = claims(root());
    json ? printJson(result) : printJson(result);
  } else if (cmd === 'audit') {
    const json = hasFlag(args, '--json');
    const limit = Number(takeFlag(args, '--limit', '50'));
    const result = readAudit(root(), { limit: Number.isFinite(limit) ? limit : 50 });
    json ? printJson(result) : process.stdout.write(result.map(r => JSON.stringify(r)).join('\n') + (result.length ? '\n' : ''));
  } else if (cmd === 'timeline') {
    const json = hasFlag(args, '--json');
    const limit = Number(takeFlag(args, '--limit', '50'));
    const result = timeline(root(), { limit: Number.isFinite(limit) ? limit : 50 });
    json ? printJson(result) : process.stdout.write(formatTimeline(result));
  } else if (cmd === 'overview') {
    const json = hasFlag(args, '--json');
    const limit = Number(takeFlag(args, '--limit', '10'));
    const result = overview(root(), { limit: Number.isFinite(limit) ? limit : 10 });
    json ? printJson(result) : process.stdout.write(formatOverview(result));
  } else if (cmd === 'claim') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const force = hasFlag(args, '--force');
    const json = hasFlag(args, '--json');
    const targetPath = args.join(' ');
    const result = claim(root(), { agent, targetPath, force });
    json ? printJson(result) : console.log(`claimed ${targetPath}`);
  } else if (cmd === 'release') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const force = hasFlag(args, '--force');
    const json = hasFlag(args, '--json');
    const targetPath = args.join(' ');
    const result = release(root(), { agent, targetPath, force });
    json ? printJson(result) : console.log(`released ${targetPath}`);
  } else {
    usage();
    process.exitCode = 2;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
