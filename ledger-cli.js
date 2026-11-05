#!/usr/bin/env node
'use strict';
// openclaw-ledger: token/cycle accounting for autonomous agents, stored in markdown.
const fs = require('fs');
const path = require('path');
const [cmd, ...rest] = process.argv.slice(2);
const arg = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
const file = arg('--file') || path.join(process.env.HOME || '.', '.openclaw', 'workspace', 'ledger.md');
const HEADER = '| Fecha | Ciclo | Comandos/herramientas | Tokens est. |';
const SEP = '|---|---|---|---|';

function readLines() {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').split('\n');
}

function parseNum(tok) { // "40k", "1.5k", "3500", "~2k"
  if (!tok) return 0;
  const m = String(tok).replace('~', '').trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([kKmM])?$/);
  if (!m) return 0;
  const mult = { k: 1e3, m: 1e6 }[String(m[2] || '').toLowerCase()] || 1;
  return parseFloat(m[1]) * mult;
}

function parseRow(line) {
  const cells = line.split('|').map(s => s.trim()).filter(Boolean);
  if (cells.length < 4) return null;
  if (cells[0] === 'Fecha' || /^-+$/.test(cells[0])) return null;
  const [fecha, ciclo, tools, tokens] = cells;
  const inM = tokens.match(/in\s*~?([0-9.]+[kKmM]?)/);
  const outM = tokens.match(/out\s*~?([0-9.]+[kKmM]?)/);
  return { fecha, ciclo, tokensIn: parseNum(inM && inM[1]), tokensOut: parseNum(outM && outM[1]) };
}

function rows(lines) {
  return (lines || []).map(parseRow).filter(Boolean);
}

if (cmd === 'add') {
  const cycle = arg('--cycle'); const tools = arg('--tools') || '-';
  const tin = arg('--in') || '0'; const tout = arg('--out') || '0';
  if (!cycle) { console.error('uso: add --cycle "desc" [--tools "cmds"] --in 12k --out 900'); process.exit(1); }
  const fecha = arg('--date') || new Date().toISOString().slice(0, 10);
  const line = `| ${fecha} | ${cycle} | ${tools} | in ~${tin} / out ~${tout} |`;
  let lines = readLines();
  if (!lines) {
    lines = ['# Ledger — consumo estimado de tokens', '', HEADER, SEP, line];
    fs.writeFileSync(file, lines.join('\n') + '\n');
  } else {
    let i = lines.findIndex(l => l === SEP);
    if (i < 0) { lines.push('', HEADER, SEP); i = lines.length - 1; }
    lines.splice(i + 1, 0, line);
    fs.writeFileSync(file, lines.join('\n'));
  }
  console.log('OK ' + line);
} else if (cmd === 'summary') {
  const date = arg('--date');
  const rs = rows(readLines()).filter(r => !date || r.fecha === date);
  if (!rs.length) { console.log('Sin entradas' + (date ? ' para ' + date : '.')); process.exit(0); }
  const tin = rs.reduce((a, r) => a + r.tokensIn, 0);
  const tout = rs.reduce((a, r) => a + r.tokensOut, 0);
  console.log(`Ciclos: ${rs.length}` + (date ? ` (${date})` : '') + ` | Tokens in: ${Math.round(tin).toLocaleString()} | out: ${Math.round(tout).toLocaleString()} | total: ${(tin + tout).toLocaleString()}`);
  const byDate = {};
  for (const r of rs) { const d = byDate[r.fecha] || (byDate[r.fecha] = { in: 0, out: 0, n: 0 }); d.in += r.tokensIn; d.out += r.tokensOut; d.n++; }
  for (const [d, v] of Object.entries(byDate)) console.log(`  ${d}: ${v.n} ciclos, in ${Math.round(v.in).toLocaleString()} / out ${Math.round(v.out).toLocaleString()}`);
} else if (cmd === 'last') {
  const rs = rows(readLines());
  const r = rs[rs.length - 1];
  if (r) console.log(`${r.fecha} · ${r.ciclo} · in ${r.tokensIn} / out ${r.tokensOut}`);
  else console.log('vacío');
} else {
  console.log('openclaw-ledger v0.1.0\nuso: add --cycle "desc" [--tools t] --in 12k --out 900 | summary [--date YYYY-MM-DD] | last');
}
