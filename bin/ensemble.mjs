#!/usr/bin/env node
import {
  claim,
  defaultAgent,
  init,
  note,
  readBoard,
  readInbox,
  release,
  requireWorkspaceRoot,
  send,
  status,
} from '../lib/core.mjs';

function usage() {
  console.log(`pi-ensemble

Usage:
  ensemble init [--agent NAME]
  ensemble status
  ensemble note MESSAGE [--from NAME]
  ensemble send AGENT MESSAGE [--from NAME] [--type note|handoff|question|result|ack]
  ensemble inbox [--agent NAME] [--no-clear]
  ensemble board
  ensemble claim PATH [--agent NAME]
  ensemble release PATH [--agent NAME]
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
    console.log(JSON.stringify(s, null, 2));
  } else if (cmd === 'note') {
    const from = takeFlag(args, '--from', defaultAgent());
    const body = args.join(' ');
    note(root(), { from, body });
    console.log('noted');
  } else if (cmd === 'send') {
    const from = takeFlag(args, '--from', defaultAgent());
    const type = takeFlag(args, '--type', 'handoff');
    const to = args.shift();
    const body = args.join(' ');
    send(root(), { from, to, type, body });
    console.log(`sent to ${to}`);
  } else if (cmd === 'inbox') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const noClear = hasFlag(args, '--no-clear');
    process.stdout.write(readInbox(root(), { agent, clear: !noClear }));
  } else if (cmd === 'board') {
    process.stdout.write(readBoard(root()));
  } else if (cmd === 'claim') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const targetPath = args.join(' ');
    claim(root(), { agent, targetPath });
    console.log(`claimed ${targetPath}`);
  } else if (cmd === 'release') {
    const agent = takeFlag(args, '--agent', defaultAgent());
    const targetPath = args.join(' ');
    release(root(), { agent, targetPath });
    console.log(`released ${targetPath}`);
  } else {
    usage();
    process.exitCode = 2;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
