#!/usr/bin/env node
/** v3 DÉFINITIF : parse le destructuring Promise.all de page.tsx, vérifie usage. */
const fs = require('fs');
const path = require('path');

const pageSrc = fs.readFileSync('/home/z/my-project/src/app/page.tsx', 'utf-8');

// Bloc destructurant : le PLUS GRAND des const [ ... ] = await Promise.all
const matches = [...pageSrc.matchAll(/const\s*\[([\s\S]*?)\]\s*=\s*await\s*Promise\.all/g)];
if (!matches.length) { console.error('destructuring introuvable'); process.exit(1); }
const m = matches.sort((a, b) => b[1].length - a[1].length)[0];
const aliasList = m[1].split(',').map((s) => s.replace(/\/\/[^\n]*/gm, '').trim()).filter(Boolean);
const alias = [...new Set(aliasList)];

// Composants
const components = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f)) components.push(fs.readFileSync(p, 'utf-8'));
  }
}
walk('/home/z/my-project/src/components');
const all = components.join('\n');

const utilises = [], invisibles = [];
for (const k of alias) {
  const rx = new RegExp('initialData\\??\\.' + k + '\\b');
  const rx2 = new RegExp('[{,\\s]' + k + '\\s*=\\s*initialData');
  if (rx.test(all) || rx2.test(all)) utilises.push(k);
  else invisibles.push(k);
}
console.log('TOTAL alias: ' + alias.length + ' · utilisés: ' + utilises.length + ' · invisibles: ' + invisibles.length);
console.log('\n--- INVISIBLES (candidats purge) ---');
console.log(invisibles.join(', '));
