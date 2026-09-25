const fs = require('fs');
let content = fs.readFileSync('src/lib/ia/outils.ts', 'utf8');

const regex = /OR:\s*\[\s*\{\s*nom:\s*\{\s*contains:\s*([^,]+),\s*mode:\s*['"]insensitive['"]\s*\}\s*\},\s*\{\s*prenom:\s*\{\s*contains:\s*\1,\s*mode:\s*['"]insensitive['"]\s*\}\s*\}(?:,\s*\{\s*matricule:\s*\{\s*contains:\s*\1\s*\}\s*\}\s*as\s*any)?\s*\]/g;

content = content.replace(regex, (match, expr) => {
  return `AND: String(${expr}).trim().split(/\\s+/).filter(Boolean).map(term => ({ OR: [{ nom: { contains: term, mode: 'insensitive' } }, { prenom: { contains: term, mode: 'insensitive' } }] }))`;
});

fs.writeFileSync('src/lib/ia/outils.ts', content, 'utf8');
console.log('Replaced all search patterns!');
