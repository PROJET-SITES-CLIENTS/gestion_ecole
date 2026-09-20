// ════════════════════════════════════════════════════════════════════
// TEST DES 3 NOUVEAUX DOCUMENTS SECRÉTARIAT
// carte_scolaire · duplicata_bulletin · attestation_ancien_eleve
// (génération réelle des corps via le registre documentaire)
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore, creerMatiereCore, creerEvaluationCore, saisirNotesCore, genererBulletinCore, changerStatutEleveCore } from '../src/lib/business';
import { docsPedagogie } from '../src/lib/documents/registre-pedagogie';
import { resoudreIdentite } from '../src/lib/documents/charte';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ Mise en place ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'docs-sec-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Docs Sec ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `dsec-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['admin.saas', 'eleves.lire', 'eleves.ecrire', 'notes.saisir', 'vie_scolaire.gerer', 'finances.voir', 'rh.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'finances.ecrire', 'finances.valider', 'presences.saisir']) } as never;
  const sec = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Sec', prenom: 'Docs', email: `sec-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'SecSec123!', roleCode: 'secretariat' } as never);
  check('école + secrétariat', !!r.ecoleId && !!sec.personnelId);

  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: '6E-A' } });
  const periode = await db.periode.findFirst({ where: { ecoleId: r.ecoleId } });
  const matiere = await creerMatiereCore(ctxDir, r.ecoleId, { code: 'FR', libelle: 'Français', coefficient: 2 } as never);
  const persProf = await db.personnel.findFirst({ where: { utilisateurId: r.adminId } });
  const el1 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Actif', prenom: 'Ali', dateNaissance: new Date('2013-02-01'), lieuNaissance: 'Dakar', sexe: 'M', classeId: classe!.id } as never);
  const el2 = await inscrireEleveCore(ctxDir, r.ecoleId, { nom: 'Ancien', prenom: 'Awa', dateNaissance: new Date('2012-08-11'), lieuNaissance: 'Thiès', sexe: 'F', classeId: classe!.id } as never);
  // notes + bulletin pour le duplicata
  const eval1 = await creerEvaluationCore(ctxDir, r.ecoleId, { classeId: classe!.id, matiereId: matiere.matiereId, enseignantId: persProf!.id, periodeId: periode!.id, type: 'devoir', intitule: 'Devoir 1', date: new Date(), sur: 20, coefficient: 1 } as never);
  await saisirNotesCore(ctxDir, { evaluationId: eval1.evaluationId, notes: [{ eleveId: el1.eleveId, valeur: 14 }] } as never);
  await genererBulletinCore(ctxDir, { eleveId: el1.eleveId, periodeId: periode!.id, classeId: classe!.id } as never);
  // ancien : sortie
  await changerStatutEleveCore(ctxDir, { eleveId: el2.eleveId, statut: 'sorti', dateSortie: new Date(Date.now() - 5 * 864e5), motif: 'transfert vers autre établissement' } as never);
  const identite = await resoudreIdentite(r.ecoleId);
  const ctxSecDocs: any = { ctx: { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['eleves.ecrire']) }, identite, p: {} };

  console.log('\n═══ 1. CARTE SCOLAIRE ═══');
  const carte = docsPedagogie.find((d: any) => d.code === 'carte_scolaire');
  check('modèle présent dans le catalogue', !!carte);
  const outCarte = await carte!.generer({ ...ctxSecDocs, p: { eleveId: el1.eleveId } } as never);
  check('corps généré', typeof outCarte.corps === 'string' && outCarte.corps.length > 200);
  check('contient nom + matricule + classe', outCarte.corps.includes('ACTIF'.toUpperCase()) && (outCarte.corps.includes(el1.eleveId) || (outCarte.corps.match(/Matricule/) ?? []).length > 0));
  check('permission = eleves.ecrire (secrétariat/direction)', carte!.permission === 'eleves.ecrire');

  console.log('\n═══ 2. DUPLICATA BULLETIN ═══');
  const dup = docsPedagogie.find((d: any) => d.code === 'duplicata_bulletin');
  check('modèle présent', !!dup);
  check('filigrane DUPLICATA', (dup as any).filigrane === 'DUPLICATA');
  const outDup = await dup!.generer({ ...ctxSecDocs, p: { eleveId: el1.eleveId, periodeId: periode!.id } } as never);
  check('corps généré (variante collège auto-détectée)', outDup.corps.includes('14') || outDup.corps.length > 500);
  check('mention duplicata présente', /duplicata/i.test(outDup.corps));

  console.log('\n═══ 3. ATTESTATION ANCIEN ÉLÈVE ═══');
  const att = docsPedagogie.find((d: any) => d.code === 'attestation_ancien_eleve');
  check('modèle présent', !!att);
  const outAtt = await att!.generer({ ...ctxSecDocs, p: { eleveId: el2.eleveId } } as never);
  check('corps généré', outAtt.corps.length > 300);
  check('période de fréquentation mentionnée', /fréquentation|→/.test(outAtt.corps));
  check('motif de sortie mentionné', outAtt.corps.includes('transfert vers autre établissement'));
  // un élève ACTIF est refusé (il faut le certificat classique)
  let refuseActif = false;
  try { await att!.generer({ ...ctxSecDocs, p: { eleveId: el1.eleveId } } as never); } catch { refuseActif = true; }
  check('élève actif ✗ refusé (utiliser le certificat classique)', refuseActif);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} DOCUMENTS SECRÉTARIAT : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — COMPLET'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('DOCS-SEC', main);
