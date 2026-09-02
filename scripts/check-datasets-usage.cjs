#!/usr/bin/env node
/** Croise les clés d'initialData (page.tsx) avec leur usage réel dans src/components. */
const fs = require('fs');
const path = require('path');

const pageSrc = fs.readFileSync('/home/z/my-project/src/app/page.tsx', 'utf-8');

// Extrait les clés du bloc initialData = { ... } (jusqu'à la fin du return)
const start = pageSrc.indexOf('const initialData = {');
const end = pageSrc.indexOf('return <AppShell');
const block = pageSrc.slice(start, end);
const keys = new Set();
for (const m of block.matchAll(/^\s{4}([a-zA-Z_][a-zA-Z0-9_]*)(:|,)/gm)) keys.add(m[1]);
for (const m of block.matchAll(/^\s{4}([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*$/gm)) keys.add(m[1]);

// charge tous les fichiers composants
const components = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) components.push(fs.readFileSync(p, 'utf-8'));
  }
}
walk('/home/z/my-project/src/components');

const appShell = components.join('\n');

const utilises = [];
const invisibles = [];
for (const k of keys) {
  const pattern = new RegExp(`initialData\\.${k}\\b|\\b${k}\\b\\s*=\\s*initialData|initialData\\?\\.${k}`);
  const pattern2 = new RegExp(`\\b${k}\\b`);
  // Usage direct via initialData.k OU destructuration locale
  const direct = appShell.match(pattern);
  if (direct) utilises.push(k);
  else invisibles.push(k);
}

console.log('=== CLÉS INITIALDATA : ' + keys.size + ' ===');
console.log('\n--- UTILISÉES (' + utilises.length + ') ---\n' + utilises.sort().join(', '));
console.log('\n--- INVISIBLES (' + invisibles.length + ') ---\n' + invisibles.sort().join(', '));
