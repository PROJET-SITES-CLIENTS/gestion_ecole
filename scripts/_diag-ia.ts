/**
 * DIAGNOSTIC IA — pourquoi l'assistant répond « impossible » ?
 * Teste : 1) clés API 2) catalogue d'outils (taille, doublons, erreurs)
 * 3) appel réel avec session direction complète
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { dbTest as db } from './_helper-test';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { CATALOGUE_IA, outilsPourSession } from '../src/lib/ia/outils';
import { Ctx } from '../src/lib/business';

async function main() {
  // 1. Catalogue
  console.log('=== CATALOGUE ===');
  console.log('Outils au catalogue :', CATALOGUE_IA.length);
  const vus = new Set<string>();
  const doublons: string[] = [];
  for (const t of CATALOGUE_IA) {
    if (vus.has(t.nom)) doublons.push(t.nom);
    vus.add(t.nom);
  }
  console.log('Doublons de noms (rejetés par OpenAI !):', doublons.length ? doublons.join(', ') : 'aucun');
  // taille du payload tools
  const tailleTools = JSON.stringify(CATALOGUE_IA.map((t) => ({ function: { name: t.nom, description: t.description, parameters: t.parametres } }))).length;
  console.log('Taille brute du payload tools (tous) :', (tailleTools / 1024).toFixed(0), 'Ko');

  // 2. Session direction (toutes permissions)
  const ecole = await db.ecole.findFirst();
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole!.id } });
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = { utilisateurId: dir!.id, ecoleId: ecole!.id, type: 'personnel', permissions: new Set(perms.map((p) => p.code)) };
  const outilsSession = outilsPourSession(ctx.permissions);
  console.log('Outils pour session direction :', outilsSession.length);
  const tailleSession = JSON.stringify(outilsSession.map((t) => ({ function: { name: t.nom, description: t.description, parameters: t.parametres } }))).length;
  console.log('Taille du payload pour la session :', (tailleSession / 1024).toFixed(0), 'Ko');

  // vérifier descriptions vides / paramètres cassés
  const suspects = outilsSession.filter((t) => !t.description || !t.parametres || !t.parametres.type);
  console.log('Outils suspects (description/params vides) :', suspects.map((s) => s.nom).join(', ') || 'aucun');

  // 3. Test réel simple
  console.log('\n=== TEST RÉEL ===');
  const r = await invoquerAssistant({ ctx, messages: [{ role: 'user', content: 'Combien avons-nous d\'élèves actifs ?' }], portail: 'direction' });
  console.log('Réponse :', r.reponse.slice(0, 300));
  console.log('Actions :', r.actions.map((a) => `${a.ok ? '✓' : '✗'}${a.outil}`).join(' · ') || '(aucune)');
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
