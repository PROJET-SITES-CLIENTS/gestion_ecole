// ════════════════════════════════════════════════════════════════════
// SECRETARIAT — SUITE : checklist dossier + registre courrier + réinscriptions
// ════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import {
  initialiserEcoleCore, creerPersonnelCore, inscrireEleveCore,
  basculerPieceDossierCore, ajouterPieceExigeeCore,
  enregistrerCourrierCore, traiterCourrierCore, enregistrerReinscriptionCore,
} from '../src/lib/business';
import { chargerDonneesPortail } from '../src/lib/loaders/par-portail';
import { dbTest as db, executerAvecRetry } from './_helper-test';
import { purgerEcoles } from './_purge-ecole';

let p = 0, f = 0;
function check(nom: string, ok: boolean, detail = '') {
  if (ok) { p++; console.log(`  ✓ ${nom}`); }
  else { f++; console.log(`  ✗ ÉCHEC ${nom}${detail ? ' — ' + detail : ''}`); }
}
const PERMS_SEC = ['eleves.lire', 'eleves.ecrire', 'communication.envoyer'];
const PERMS_DIR = ['admin.saas', 'rh.gerer', 'eleves.lire', 'eleves.ecrire', 'finances.voir', 'finances.ecrire', 'finances.valider', 'vie_scolaire.gerer', 'securite.gerer', 'bulletins.valider', 'communication.envoyer', 'services.gerer', 'edt.gerer', 'sante.gerer', 'salles.gerer', 'protection.gerer', 'notes.saisir', 'presences.saisir'];

async function main() {
  const S = Date.now().toString(36).slice(-6);
  console.log('═══ 0. MISE EN PLACE ═══');
  const residuelles = await db.ecole.findMany({ where: { slug: { startsWith: 'sec-suite-' } }, select: { id: true } });
  if (residuelles.length) await purgerEcoles(residuelles.map((x) => x.id));
  const r = await initialiserEcoleCore({ nomEcole: `Sec Suite ${S}`, adminNom: 'Dir', adminPrenom: 'Test', adminEmail: `suite-${S}@test.sn`, adminMotDePasse: 'Directeur123!' } as never);
  const ctxDir = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_DIR) } as never;
  const sec = await creerPersonnelCore(ctxDir, r.ecoleId, { nom: 'Sec', prenom: 'Suite', email: `sec-${S}@test.sn`, dateEmbauche: new Date(), typeContrat: 'CDI', salaireBrut: 180000, creerCompte: true, motDePasseInitial: 'SecSec123!', roleCode: 'secretariat' } as never);
  const uSec = await db.utilisateur.findFirst({ where: { email: `sec-${S}@test.sn` } });
  const ctxSec = { utilisateurId: uSec!.id, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(PERMS_SEC) } as never;
  const sessSec = { utilisateur: { id: uSec!.id, ecoleId: r.ecoleId, email: uSec!.email, nom: 'Sec', prenom: 'Suite', type: 'personnel' }, permissions: new Set(PERMS_SEC), roles: ['secretariat'], sessionId: 't' } as never;
  check('école + secrétariat', !!r.ecoleId && !!sec.personnelId);

  console.log('\n═══ 1. CHECKLIST DU DOSSIER D INSCRIPTION ═══');
  const classe = await db.classe.findFirst({ where: { ecoleId: r.ecoleId, code: 'CE1-A' } });
  const el = await inscrireEleveCore(ctxSec, r.ecoleId, { nom: 'Mbaye', prenom: 'Codou', dateNaissance: new Date('2016-05-20'), lieuNaissance: 'Dakar', sexe: 'F', classeId: classe!.id } as never);
  const pieces = await db.pieceDossier.findMany({ where: { eleveId: el.eleveId } });
  check('5 pièces standard AUTO-créées à l\'inscription', pieces.length === 5, `${pieces.length}`);
  check('toutes manquantes au départ', pieces.every((x: any) => x.statut === 'manquante'));
  // Le secrétariat en reçoit 4 → dossier encore incomplet
  for (const piece of pieces.slice(0, 4)) await basculerPieceDossierCore(ctxSec, piece.id, 'recue');
  const apres4 = await db.pieceDossier.findMany({ where: { eleveId: el.eleveId } });
  check('4 reçues, 1 manquante → dossier INCOMPLET', apres4.filter((x: any) => x.statut === 'recue').length === 4 && apres4.filter((x: any) => x.statut === 'manquante').length === 1);
  const derniereManquante = apres4.find((x: any) => x.statut === 'manquante')!;
  await basculerPieceDossierCore(ctxSec, derniereManquante.id, 'recue', 'photo apportée le jour même');
  const complet = await db.pieceDossier.findMany({ where: { eleveId: el.eleveId } });
  const pieceRemarquee = complet.find((x: any) => x.id === derniereManquante.id)!;
  check('5/5 → dossier COMPLET (avec remarque conservée)', complet.filter((x: any) => x.type !== 'certificat_transfert').every((x: any) => x.statut === 'recue') && pieceRemarquee.remarque === 'photo apportée le jour même');
  // Pièce supplémentaire exigée (transfert)
  const extra = await ajouterPieceExigeeCore(ctxSec, el.eleveId, 'certificat_transfert');
  check('pièce spécifique exigée (certificat de transfert)', !!extra.pieceId);
  // Le prof NE PEUT PAS gérer le dossier
  let refuse = false;
  try { await basculerPieceDossierCore({ utilisateurId: 'x', ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['eleves.lire', 'notes.saisir']) } as never, extra.pieceId, 'recue'); } catch { refuse = true; }
  check('enseignant ✗ ne peut pas gérer la checklist (eleves.ecrire requis)', refuse);
  // KPI portail
  const dSec: any = await chargerDonneesPortail('secretariat', sessSec, null);
  const piecesVues = (dSec.piecesDossier ?? []).filter((x: any) => x.eleveId === el.eleveId);
  check('portail secrétariat : checklist visible (6 pièces)', piecesVues.length === 6, `${piecesVues.length}`);

  console.log('\n═══ 2. REGISTRE DU COURRIER ═══');
  const ent = await enregistrerCourrierCore(ctxSec, r.ecoleId, { direction: 'entrant', type: 'recommande', objet: 'Demande de transfert — famille Ndiaye', correspondant: 'École Les Palmiers' });
  const sor = await enregistrerCourrierCore(ctxSec, r.ecoleId, { direction: 'sortant', objet: 'Certificat de radiation — Moussa Sarr', correspondant: 'Famille Sarr' });
  check(`courrier ENTRANT chronoté ${ent.reference}`, ent.reference.startsWith('C-ENT-'));
  check(`courrier SORTANT chronoté ${sor.reference}`, sor.reference.startsWith('C-SOR-'));
  const ent2 = await enregistrerCourrierCore(ctxSec, r.ecoleId, { direction: 'entrant', objet: 'Convention transport', correspondant: 'Mairie' });
  check('séquence incrémentée (C-ENT-0002)', ent2.reference === 'C-ENT-0002', ent2.reference);
  let dejaTraite = false;
  await traiterCourrierCore(ctxSec, ent.courrierId, 'Réponse envoyée');
  try { await traiterCourrierCore(ctxSec, ent.courrierId, 'x'); } catch { dejaTraite = true; }
  check('courrier traité + re-traitement refusé', dejaTraite);
  const dSec2: any = await chargerDonneesPortail('secretariat', sessSec, null);
  check('portail : registre visible (3 courriers, 1 traité)', (dSec2.courriers ?? []).length === 3 && dSec2.courriers.filter((c: any) => c.traite).length === 1);

  console.log('\n═══ 3. RÉINSCRIPTIONS (campagne de rentrée) ═══');
  const re1 = await enregistrerReinscriptionCore(ctxSec, { eleveId: el.eleveId, classeVoulueId: classe!.id, fraisPayes: false });
  check('réinscription enregistrée', !!re1.reinscriptionId);
  const re2 = await enregistrerReinscriptionCore(ctxSec, { eleveId: el.eleveId, fraisPayes: true });
  check('idempotente : la 2e saisie MET À JOUR (pas de doublon)', re2.dejaInscrit === true);
  const nb = await db.reinscription.count({ where: { eleveId: el.eleveId } });
  check('1 seule ligne en base', nb === 1, `${nb}`);
  const reDb = await db.reinscription.findFirst({ where: { eleveId: el.eleveId } });
  check('frais passés à payés (mise à jour)', reDb?.fraisPayes === true);
  const dSec3: any = await chargerDonneesPortail('secretariat', sessSec, null);
  check('portail : liste réinscriptions visible', (dSec3.reinscriptions ?? []).length === 1);
  // Un élève non actif ne peut pas être réinscrit
  const el2 = await inscrireEleveCore(ctxSec, r.ecoleId, { nom: 'Sorti', prenom: 'Pape', dateNaissance: new Date('2015-01-01'), lieuNaissance: 'D', sexe: 'M', classeId: classe!.id } as never);
  await db.eleve.update({ where: { id: el2.eleveId }, data: { statut: 'sorti', dateSortie: new Date(), motifSortie: 'déménagement' } });
  let refuseInactif = false;
  try { await enregistrerReinscriptionCore(ctxSec, { eleveId: el2.eleveId }); } catch { refuseInactif = true; }
  check('élève sorti ✗ non réinscriptible', refuseInactif);

  console.log('\n═══ Nettoyage ═══');
  const purge = await purgerEcoles([r.ecoleId]);
  console.log(purge ? '✓ école supprimée' : '⚠ résiduel');

  const total = p + f;
  console.log(`\n${f === 0 ? '✅✅✅' : '⚠️'} SUITE SECRÉTARIAT : ${p}/${total} VÉRIFICATIONS${f ? ` — ${f} ÉCHEC(S)` : ' — COMPLET'}`);
  if (f) process.exitCode = 1;
}

executerAvecRetry('SEC-SUITE', main);
