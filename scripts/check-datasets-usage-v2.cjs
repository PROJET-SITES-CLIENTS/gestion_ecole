#!/usr/bin/env node
/** v2 : extrait TOUS les alias de requêtes de page.tsx et vérifie leur usage composants. */
const fs = require('fs');
const path = require('path');

const pageSrc = fs.readFileSync('/home/z/my-project/src/app/page.tsx', 'utf-8');

// 1) alias du destructuring Promise.all : lignes du tableau destructuré + requêtes db.
// On capture tous les identifiants apparaissant dans les lignes d'alias ET
// tous les alias initiaux "const [a, b, ...] = await Promise.all" + alias simples.
const destrStart = pageSrc.indexOf('] = await Promise.all');
const head = pageSrc.slice(0, destrStart);
// alias déclarés dans la tête du destructuring (multi-lignes)
const alias = new Set();
for (const m of head.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*[,\]]/g)) alias.add(m[1]);
alias.delete('const');

// 2) usage composants
const components = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) components.push(fs.readFileSync(p, 'utf-8'));
  }
}
walk('/home/z/my-project/src/components');
walk('/home/z/my-project/src/app');
const all = components.join('\n');

const utilises = [], invisibles = [];
for (const k of [...alias].sort()) {
  if (k === 'Promise' || k === 'await' || k === 'all') continue;
  const rx = new RegExp(`initialData\\??\\.${k}\\b`);
  if (rx.test(all) || new RegExp(`\\b${k}\\s*=\\s*initialData`).test(all)) utilises.push(k);
  else invisibles.push(k);
}

// 3) clés explicites du bloc initialData (inclut remappings type documents: documentsEleve)
const blockStart = pageSrc.indexOf('const initialData = {');
const blockEnd = pageSrc.indexOf('return <AppShell', blockStart);
const block = pageSrc.slice(blockStart, blockEnd);
const keys = new Set();
for (const m of block.matchAll(/^\s+([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*[:,])/gm)) keys.add(m[1]);
const invisibles2 = [...keys].filter((k) => !(new RegExp(`initialData\\??\\.${k}\\b`).test(all) || new RegExp(`\\b${k}\\s*=\\s*initialData`).test(all)));

console.log('ALIAS REQUÊTES: ' + alias.size + ' | utilisés: ' + utilises.length + ' | invisibles: ' + invisibles.length);
console.log('\n--- ALIAS INVISIBLES (à purger) ---\n' + invisibles.join(', '));
console.log('\n--- CLÉS INITIALDATA INVISIBLES (dont remappées) ---\n' + invisibles2.join(', '));
