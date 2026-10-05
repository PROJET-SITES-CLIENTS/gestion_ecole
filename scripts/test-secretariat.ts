/**
 * TEST — AUDIT SECRÉTARIAT (6 écarts + 8 manques)
 *   S1 relance pièces dossier → notification parent créée + refus si complet
 *   S2 coordonnées famille → adresse/contact urgence/parent mis à jour + email invalide refusé
 *   S3 convocation_eleve accessible avec eleves.ecrire (permission multiple)
 *   S4 secretariat.gerer : rôle migré (vérifié en base)
 *   S5 liste_eleves_classe / registre_diplomes : modèles enregistrés dans le catalogue
 * Exécution : npx tsx scripts/test-secretariat.ts
 */
import { Ctx, relancerPiecesDossierCore, majCoordonneesFamilleCore } from '../src/lib/business';
import { dbTest as db } from './_helper-test';

const MARK = 'SECT';
const results: Array<{ n: string; ok: boolean; d: string }> = [];
const check = (n: string, ok: boolean, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école');
  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
  const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } });
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!annee || !niveau || !dir) throw new Error('Structure incomplète');
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = { utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(perms.map((p) => p.code)) };

  // Nettoyage
  await db.notification.deleteMany({ where: { sujet: { startsWith: `Dossier incomplet — ${MARK}` } } });
  // orphelins de runs interrompus (FK d'abord)
  const orphelins = await db.eleve.findMany({ where: { ecoleId: ecole.id, nom: { startsWith: `${MARK}N` } }, select: { id: true } });
  if (orphelins.length > 0) {
    await db.eleveParent.deleteMany({ where: { eleveId: { in: orphelins.map((o) => o.id) } } });
    await db.pieceDossier.deleteMany({ where: { eleveId: { in: orphelins.map((o) => o.id) } } });
    await db.eleve.deleteMany({ where: { id: { in: orphelins.map((o) => o.id) } } });
  }
  await db.parentTuteur.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: `${MARK}P` } } });

  // Fixture : élève + parent + pièce manquante
  const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id, anneeScolaireId: annee.id } });
  // Parent AVEC compte utilisateur : la notification in-app ne touche que
  // les parents ayant un portail (comportement métier)
  await db.utilisateur.deleteMany({ where: { email: `${MARK}@test.local` } });
  const uParent = await db.utilisateur.create({ data: { email: `${MARK}@test.local`, motDePasseHash: 'x', nom: `${MARK}Parent`, prenom: 'Ada', type: 'parent', actif: true, ecoleId: ecole.id } });
  const parent = await db.parentTuteur.create({ data: { ecoleId: ecole.id, nom: `${MARK}Parent`, prenom: 'Ada', telephone: '770000001', lienAvecEleve: 'mere', utilisateurId: uParent.id } });
  const eleve = await db.eleve.create({
    data: { ecoleId: ecole.id, nom: `${MARK}Ndiaye`, prenom: 'Binta', sexe: 'F', dateNaissance: new Date('2012-03-03'), dateInscription: new Date(), matricule: `${MARK}S1`, classeActuelleId: classe?.id },
  });
  await db.eleveParent.create({ data: { eleveId: eleve.id, parentId: parent.id } });
  await db.pieceDossier.create({ data: { ecoleId: ecole.id, eleveId: eleve.id, type: 'acte_naissance', statut: 'manquante' } });
  await db.pieceDossier.create({ data: { ecoleId: ecole.id, eleveId: eleve.id, type: 'photos_identite', statut: 'recue', dateReception: new Date() } });

  // ═══ S1 — relance pièces ═══
  {
    const avant = await db.notification.count({ where: { destinataireId: uParent.id, sujet: { contains: 'Dossier incomplet' } } });
    const r = await relancerPiecesDossierCore(ctx, eleve.id);
    const apres = await db.notification.count({ where: { destinataireId: uParent.id, sujet: { contains: 'Dossier incomplet' } } });
    check('S1a notification parent créée', apres > avant, `${avant}→${apres}`);
    check('S1b la pièce manquante est citée', r.piecesManquantes.some((p) => /acte/i.test(p)), r.piecesManquantes.join(','));
    // Dossier complet → refus propre
    await db.pieceDossier.updateMany({ where: { eleveId: eleve.id }, data: { statut: 'recue' } });
    let refuse = false;
    try { await relancerPiecesDossierCore(ctx, eleve.id); } catch (e: any) { refuse = /complet/i.test(e?.message ?? ''); }
    check('S1c refus propre si dossier complet', refuse);
    await db.pieceDossier.updateMany({ where: { eleveId: eleve.id, type: 'acte_naissance' }, data: { statut: 'manquante' } });
  }

  // ═══ S2 — coordonnées famille ═══
  {
    const r = await majCoordonneesFamilleCore(ctx, {
      eleveId: eleve.id, adresseEleve: 'Quartier Médina, Dakar',
      contactUrgenceNom: 'Oncle Ali', contactUrgenceTelephone: '771111112',
      parentId: parent.id, parentTelephone: '772222223', parentEmail: 'ada@test.sn', parentProfession: 'Commerçante',
    });
    check('S2a retour parent modifié', (r as any).parentModifie?.includes('Ada'));
    const e2 = await db.eleve.findUnique({ where: { id: eleve.id } });
    const urg = JSON.parse(e2?.contactUrgence ?? '{}');
    const p2 = await db.parentTuteur.findUnique({ where: { id: parent.id } });
    check('S2b adresse + contact urgence stockés', e2?.adresse === 'Quartier Médina, Dakar' && urg.nom === 'Oncle Ali' && urg.telephone === '771111112');
    check('S2c parent mis à jour', p2?.telephone === '772222223' && p2?.email === 'ada@test.sn' && p2?.profession === 'Commerçante');
    let refuseEmail = false;
    try {
      await majCoordonneesFamilleCore(ctx, { eleveId: eleve.id, parentId: parent.id, parentEmail: 'pas-un-email' });
    } catch (e: any) { refuseEmail = /email/i.test(e?.message ?? ''); }
    check('S2d email invalide refusé', refuseEmail);
  }

  // ═══ S3 — convocation_eleve permission multiple ═══
  {
    const { CATALOGUE } = await import('../src/lib/documents/registre');
    const conv = CATALOGUE.find((m) => m.code === 'convocation_eleve');
    check('S3a convocation_eleve autorisée avec eleves.ecrire', Array.isArray(conv?.permission) && (conv?.permission as string[]).includes('eleves.ecrire'), JSON.stringify(conv?.permission));
    const liste = CATALOGUE.find((m) => m.code === 'liste_eleves_classe');
    const reg = CATALOGUE.find((m) => m.code === 'registre_diplomes');
    check('S5a liste_eleves_classe enregistrée (permission eleves.lire)', liste?.permission === 'eleves.lire');
    check('S5b registre_diplomes enregistré (permission bulletins.valider)', reg?.permission === 'bulletins.valider');
  }

  // ═══ S4 — rôle secretariat migré (permissions) ═══
  {
    const role = await db.role.findFirst({ where: { code: 'secretariat' }, include: { permissions: { include: { permission: true } } } });
    const codes = new Set(role?.permissions.map((rp) => rp.permission.code) ?? []);
    check('S4a secretariat.gerer attribuée', codes.has('secretariat.gerer'));
    check('S4b presences.saisir + finances.voir attribuées', codes.has('presences.saisir') && codes.has('finances.voir'));
  }

  // Nettoyage final
  await db.notification.deleteMany({ where: { sujet: { startsWith: `Dossier incomplet — ${MARK}` } } });
  await db.pieceDossier.deleteMany({ where: { eleveId: eleve.id } });
  await db.eleveParent.deleteMany({ where: { eleveId: eleve.id } });
  await db.eleve.delete({ where: { id: eleve.id } });
  await db.parentTuteur.delete({ where: { id: parent.id } });
  await db.utilisateur.delete({ where: { id: uParent.id } });

  const echecs = results.filter((x) => !x.ok).length;
  console.log(`\n===== ${results.length - echecs}/${results.length} PASS =====`);
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
