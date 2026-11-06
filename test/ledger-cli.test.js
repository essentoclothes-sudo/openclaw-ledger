#!/usr/bin/env node
'use strict';
// openclaw-ledger tests — zero deps, node:test + CLI spawn.
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'ledger-cli.js');
let tmp = null;
const file = () => (tmp = path.join(os.tmpdir(), 'ledger-test-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.md'));
const run = (args) => execFileSync(process.execPath, [BIN, ...args], { encoding: 'utf8' }).trimEnd();
const runFail = (args) => {
  try { execFileSync(process.execPath, [BIN, ...args], { encoding: 'utf8' }); return null; }
  catch (e) { return { code: e.status, stderr: String(e.stderr).trim() }; }
};
const cleanup = () => { if (tmp) { try { fs.unlinkSync(tmp); } catch {} tmp = null; } };

test('add creates a new ledger file with header when missing', () => {
  const f = file();
  const out = run(['add', '--file', f, '--cycle', 'test cycle', '--tools', 'none', '--in', '1k', '--out', '100']);
  try {
    assert.ok(out.startsWith('OK '));
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    assert.strictEqual(lines[0], '# Ledger — consumo estimado de tokens');
    assert.strictEqual(lines[2], '| Fecha | Ciclo | Comandos/herramientas | Tokens est. |');
    assert.ok(lines[4].includes('| test cycle |'));
    assert.ok(lines[4].includes('in ~1k / out ~100'));
  } finally { cleanup(); }
});

test('add inserts row after separator in existing ledger', () => {
  const f = file();
  fs.writeFileSync(f, ['# Ledger', '', '| Fecha | Ciclo | Comandos/herramientas | Tokens est. |', '|---|---|---|---|', '| 2026-01-01 | old | x | in ~5k / out ~1k |'].join('\n') + '\n');
  run(['add', '--file', f, '--cycle', 'new cycle', '--in', '2k', '--out', '200']);
  try {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    assert.strictEqual(lines[5], '| 2026-01-01 | old | x | in ~5k / out ~1k |');
    assert.ok(lines[4].includes('| new cycle |'));
  } finally { cleanup(); }
});

test('add without --cycle exits 1 with usage', () => {
  const f = file();
  const r = runFail(['add', '--file', f]);
  assert.strictEqual(r.code, 1);
  assert.ok(r.stderr.includes('uso:'));
});

test('add --date sets a custom date', () => {
  const f = file();
  run(['add', '--file', f, '--cycle', 'c', '--date', '2026-02-03', '--in', '1', '--out', '1']);
  try {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    assert.ok(lines[4].startsWith('| 2026-02-03 |'));
  } finally { cleanup(); }
});

test('summary aggregates in/out/total and k/m suffixes', () => {
  const f = file();
  fs.writeFileSync(f, ['# L', '', '| Fecha | Ciclo | Comandos/herramientas | Tokens est. |', '|---|---|---|---|',
    '| 2026-01-01 | a | x | in ~1.5k / out ~100 |',
    '| 2026-01-02 | b | y | in ~2m / out ~1k |'].join('\n') + '\n');
  try {
    const out = run(['summary', '--file', f]);
    assert.ok(out.includes('Ciclos: 2'));
    assert.ok(out.includes('in: 2,001,500'));
    assert.ok(out.includes('out: 1,100'));
    assert.ok(out.includes('total: 2,002,600'));
    assert.ok(out.includes('2026-01-01: 1 ciclos'));
  } finally { cleanup(); }
});

test('summary --date filters rows', () => {
  const f = file();
  fs.writeFileSync(f, ['# L', '', '| Fecha | Ciclo | Comandos/herramientas | Tokens est. |', '|---|---|---|---|',
    '| 2026-01-01 | a | x | in ~1k / out ~100 |',
    '| 2026-01-02 | b | y | in ~2k / out ~200 |'].join('\n') + '\n');
  try {
    const out = run(['summary', '--file', f, '--date', '2026-01-02']);
    assert.ok(out.includes('Ciclos: 1 (2026-01-02)'));
    assert.ok(!out.includes('2026-01-01:'));
  } finally { cleanup(); }
});

test('summary on empty/missing file exits 0', () => {
  const f = file();
  const out = run(['summary', '--file', f]);
  assert.strictEqual(out, 'Sin entradas.');
});

test('last prints the newest row', () => {
  const f = file();
  fs.writeFileSync(f, ['# L', '', '| Fecha | Ciclo | Comandos/herramientas | Tokens est. |', '|---|---|---|---|',
    '| 2026-01-01 | a | x | in ~1k / out ~100 |',
    '| 2026-01-02 | b | y | in ~2k / out ~200 |'].join('\n') + '\n');
  try {
    const out = run(['last', '--file', f]);
    assert.ok(out.startsWith('2026-01-02 · b ·'));
    assert.ok(out.includes('in 2000 / out 200'));
  } finally { cleanup(); }
});

test('last on empty prints vacío', () => {
  const f = file();
  assert.strictEqual(run(['last', '--file', f]), 'vacío');
});

test('no command prints usage with version', () => {
  const out = run([]);
  assert.ok(out.includes('openclaw-ledger v'));
  assert.ok(out.includes('uso:'));
});
