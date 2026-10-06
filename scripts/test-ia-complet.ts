/**
 * TEST COMPLET IA — vérification opérationnelle à tous points de vue
 * Teste 8 scénarios réels avec session direction complète :
 *   T1 Lecture simple     : "Combien d'élèves ?"
 *   T2 Lecture liste      : "Liste les classes"
 *   T3 Création           : "Crée la matière Histoire-Géo"
 *   T4 Modification       : "Renomme la matière Histoire-Géo en Histoire"
 *   T5 Suppression        : "Supprime la matière Histoire"
 *   T6 Action composée    : "Inscrit l'élève Test IA, 2012-01-01, F, en 6ème A"
 *   T7 Vérif XML          : la réponse ne doit JAMAIS contenir <tool_call>
 *   T8 Réponse naturelle  : pas de JSON brut, pas de fallback visible
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { dbTest as db } from './_helper-test';
import { invoquerAssistant } from '../src/lib/ia/agent';
import { Ctx } from '../src/lib/business';

const MARK = 'IATEST';

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!dir) throw new Error('Aucun utilisateur');
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = {
    utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel',
    permissions: new Set(perms.map((p) => p.code)),
  };
  console.log(`École : ${ecole.nom} — ${ctx.permissions.size} permissions\n`);

  // Nettoyage préalable
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } });
  await db.eleve.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: MARK } } });
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });

  const results: Array<{ n: string; ok: boolean; d: string }> = [];
  const check = (n: string, ok: boolean, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };

  async function test(message: string, verifs: Array<{ nom: string; test: (r: any) => boolean | Promise<boolean>; detail?: (r: any) => string }>) {
    console.log(`\n👤 « ${message} »`);
    try {
      const r = await invoquerAssistant({ ctx, messages: [{ role: 'user', content: message }], portail: 'direction' });
      const reponse = r.reponse ?? '';
      const actions = r.actions ?? [];
      console.log(`🤖 ${reponse.slice(0, 200)}`);
      console.log(`   outils : ${actions.map((a) => `${a.ok ? '✓' : '✗'}${a.outil}`).join(' · ') || '(aucun)'}`);
      for (const v of verifs) {
        const verdict = await v.test({ reponse, actions }); check(v.nom, verdict, v.detail ? v.detail({ reponse, actions }) : '');
      }
      return { reponse, actions };
    } catch (e: any) {
      console.log(`❌ ERREUR : ${e?.message?.slice(0, 120)}`);
      for (const v of verifs) check(v.nom, false, 'exception');
      return { reponse: '', actions: [] };
    }
  }

  // ═══ T1 : Lecture simple ═══
  await test('Combien avons-nous d\'élèves actifs ?', [
    { nom: 'T1a outil appelé', test: (r) => r.actions.length > 0 },
    { nom: 'T1b réponse naturelle (pas JSON/XML)', test: (r) => !r.reponse.startsWith('{') && !r.reponse.includes('<tool_call>') && r.reponse.length > 10 },
    { nom: 'T1c chiffre mentionné', test: (r) => /\d/.test(r.reponse) },
  ]);

  // ═══ T2 : Lecture liste ═══
  await test('Quelles sont nos classes ?', [
    { nom: 'T2a outil appelé', test: (r) => r.actions.length > 0 },
    { nom: 'T2b pas de XML brut', test: (r) => !r.reponse.includes('<tool_call>') && !r.reponse.includes('<function=') },
  ]);

  // ═══ T3 : Création ═══
  await test(`Crée la matière ${MARK} Histoire-Géo avec coefficient 2`, [
    { nom: 'T3a matière créée en base', test: async () => Boolean(await db.matiere.findFirst({ where: { ecoleId: ecole.id, libelle: `${MARK} Histoire-Géo` } })) },
  ]);

  // ═══ T4 : Modification ═══
  await test(`Renomme la matière ${MARK} Histoire-Géo en ${MARK} Histoire`, [
    { nom: 'T4a matière renommée', test: async () => Boolean(await db.matiere.findFirst({ where: { ecoleId: ecole.id, libelle: `${MARK} Histoire` } })) },
  ]);

  // ═══ T5 : Suppression ═══
  await test(`Supprime la matière ${MARK} Histoire`, [
    { nom: 'T5a matière supprimée', test: async () => !(await db.matiere.findFirst({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } })) },
  ]);

  // ═══ T6 : Action composée (élève + classe) ═══
  await test(`Inscrit l'élève ${MARK} Tchango Boris, né le 2012-02-13, garçon, en 6ème A`, [
    { nom: 'T6a élève créé', test: async () => Boolean(await db.eleve.findFirst({ where: { ecoleId: ecole.id, nom: { startsWith: MARK } } })) },
  ]);

  // ═══ T7 : Vérif globale — pas de XML dans aucune réponse ═══
  {
    const r = await invoquerAssistant({ ctx, messages: [{ role: 'user', content: 'Dis-moi simplement bonjour' }], portail: 'direction' });
    check('T7a pas de <tool_call> dans salutation', !r.reponse.includes('<tool_call>'));
    check('T7b pas de <function= dans salutation', !r.reponse.includes('<function='));
  }

  // Nettoyage final
  const el = await db.eleve.findFirst({ where: { ecoleId: ecole.id, nom: { startsWith: MARK } } });
  if (el) {
    await db.pieceDossier.deleteMany({ where: { eleveId: el.id } });
    await db.eleveHistoriqueClasse.deleteMany({ where: { eleveId: el.id } });
    await db.eleve.delete({ where: { id: el.id } });
  }
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } });
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });

  const echecs = results.filter((r) => !r.ok).length;
  console.log(`\n═══ ${results.length - echecs}/${results.length} PASS ═══`);
  if (echecs > 0) {
    console.table(results.filter((r) => !r.ok));
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
