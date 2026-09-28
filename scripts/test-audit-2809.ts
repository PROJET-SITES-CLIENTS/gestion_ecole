/**
 * TEST BOUT-EN-BOUT — AUDIT du 28/09
 * Valide les nouvelles fonctions : upload document élève (+ marquage
 * automatique de la pièce), stats d'absentéisme complètes, salles
 * (création / modification / affectation à une classe / suppression),
 * CRUD matières (modifier / supprimer bloqué si utilisé), chapitre avec
 * période trimestre, écriture SYSCOHADA de validation de dépense.
 * Exécution : npx tsx scripts/test-audit-2809.ts
 */
import {
  Ctx, ActionError,
  televerserDocumentEleveCore, supprimerDocumentEleveCore,
  statsAbsencesCore, notifierFamillesAbsencesCore,
  modifierSalleCore, supprimerSalleCore, affecterSalleClasseCore,
  modifierMatiereCore, supprimerMatiereCore,
  modifierChapitreCore, supprimerChapitreCore,
  enregistrerDepenseCore, validerDepenseCore,
} from '../src/lib/business';
import { dbTest } from './_helper-test';

const db = dbTest;
const MARK = 'AUDIT28';
const results: Array<{ test: string; verdict: string; detail: string }> = [];

function verdir(test: string, ok: boolean, detail = '') {
  results.push({ test, verdict: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? '✓' : '✗'} ${test}${detail ? ` — ${detail}` : ''}`);
}

async function attenduRefus(fn: () => Promise<unknown>, fragment: string): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch (e) {
    const msg = e instanceof ActionError ? e.message : String(e);
    return msg.toLowerCase().includes(fragment.toLowerCase());
  }
}

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école en base');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!dir) throw new Error('Aucun utilisateur en base');
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = {
    utilisateurId: dir.id,
    ecoleId: ecole.id,
    type: 'personnel',
    permissions: new Set(perms.map((p) => p.code)),
  };
  console.log(`École : ${ecole.nom} · ${ctx.permissions.size} permissions\n`);

  // ---------- Nettoyage préalable ----------
  // Élèves/personnel de test orphelins d'une exécution interrompue
  {
    const orphelins = await db.eleve.findMany({ where: { ecoleId: ecole.id, OR: [{ nom: { startsWith: MARK } }, { matricule: { startsWith: MARK } }] }, select: { id: true } });
    const ids = orphelins.map((o) => o.id);
    if (ids.length > 0) {
      await db.presence.deleteMany({ where: { eleveId: { in: ids } } });
      await db.pieceDossier.deleteMany({ where: { eleveId: { in: ids } } });
      await db.eleveHistoriqueClasse.deleteMany({ where: { eleveId: { in: ids } } });
      await db.eleve.deleteMany({ where: { id: { in: ids } } });
    }
  }
  // Nettoyage ordonné topologiquement (FK d'abord) des résidus éventuels
  // d'une exécution interrompue
  await db.documentEleve.deleteMany({ where: { nomFichier: { startsWith: MARK } } });
  await db.pieceDossier.deleteMany({ where: { remarque: { startsWith: `Fichier importé : ${MARK}` } } });
  await db.periode.deleteMany({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } });
  await db.anneeScolaire.deleteMany({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } });
  const classesAud = await db.classe.findMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } }, select: { id: true } });
  if (classesAud.length > 0) {
    const idsC = classesAud.map((c) => c.id);
    await db.presence.deleteMany({ where: { seance: { classeId: { in: idsC } } } });
    await db.seance.deleteMany({ where: { classeId: { in: idsC } } });
    await db.evaluation.deleteMany({ where: { classeId: { in: idsC } } });
  }
  await db.evaluation.deleteMany({ where: { ecoleId: ecole.id, intitule: { startsWith: MARK } } });
  const progsAud = await db.programme.findMany({ where: { ecoleId: ecole.id, titre: { startsWith: MARK } }, select: { id: true } });
  if (progsAud.length > 0) {
    await db.seance.updateMany({ where: { chapitreId: { in: (await db.chapitre.findMany({ where: { programmeId: { in: progsAud.map((p) => p.id) } }, select: { id: true } })).map((c) => c.id) } }, data: { chapitreId: null } });
    await db.avancementProgramme.deleteMany({ where: { chapitre: { programmeId: { in: progsAud.map((p) => p.id) } } } });
    await db.chapitre.deleteMany({ where: { programmeId: { in: progsAud.map((p) => p.id) } } });
    await db.programme.deleteMany({ where: { id: { in: progsAud.map((p) => p.id) } } });
  }
  await db.salle.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: MARK } } });
  await db.classe.updateMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } }, data: { salleId: null } });
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.personnel.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: 'AUDIT28' } } });
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.depense.deleteMany({ where: { ecoleId: ecole.id, categorie: { startsWith: MARK } } });
  await db.ligneEcriture.deleteMany({ where: { ecriture: { ecoleId: ecole.id, libelle: { startsWith: `Dépense ${MARK}` } } } });
  await db.ecritureComptable.deleteMany({ where: { ecoleId: ecole.id, libelle: { startsWith: `Dépense ${MARK}` } } });

  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
  const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } });
  const periode = annee ? await db.periode.findFirst({ where: { ecoleId: ecole.id, anneeScolaireId: annee.id } }) : null;
  if (!annee || !niveau || !periode) throw new Error('Données de base incomplètes (année/niveau/période)');
  // Élève de travail : le premier de l'école, sinon un élève de test créé pour l'occasion
  let eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, deletedAt: null } });
  let eleveACreer = false;
  if (!eleve) {
    eleve = await db.eleve.create({
      data: { ecoleId: ecole.id, nom: `${MARK}Sow`, prenom: 'Élève', sexe: 'M', dateNaissance: new Date('2012-05-10'), dateInscription: new Date(), matricule: `${MARK}000` },
    });
    eleveACreer = true;
  }

  // ================= A1 — Téléversement document élève =================
  {
    const contenu = Buffer.from('%PDF-1.4 test audit');
    const r = await televerserDocumentEleveCore(ctx, {
      eleveId: eleve.id, type: 'acte_naissance',
      nomFichier: `${MARK}-acte.pdf`, mimeType: 'application/pdf',
      taille: contenu.length, contenu: new Uint8Array(contenu),
    });
    const doc = await db.documentEleve.findUnique({ where: { id: r.documentId } });
    const piece = await db.pieceDossier.findUnique({ where: { eleveId_type: { eleveId: eleve.id, type: 'acte_naissance' } } });
    verdir('A1a upload document + stockage binaire', Boolean(doc?.contenu) && doc?.nomFichier === `${MARK}-acte.pdf`);
    verdir('A1b pièce du dossier marquée REÇUE automatiquement', piece?.statut === 'recue', piece?.statut ?? 'pièce absente');

    const tropLourd = await attenduRefus(
      () => televerserDocumentEleveCore(ctx, {
        eleveId: eleve.id, type: 'autre', nomFichier: `${MARK}-gros.pdf`,
        mimeType: 'application/pdf', taille: 6 * 1024 * 1024, contenu: new Uint8Array(6 * 1024 * 1024),
      }),
      'volumineux',
    );
    verdir('A1c refus fichier > 5 Mo', tropLourd);

    const mauvaisFormat = await attenduRefus(
      () => televerserDocumentEleveCore(ctx, {
        eleveId: eleve.id, type: 'autre', nomFichier: `${MARK}-script.exe`,
        mimeType: 'application/x-msdownload', taille: 10, contenu: new Uint8Array(10),
      }),
      'format',
    );
    verdir('A1d refus format non autorisé', mauvaisFormat);

    const suppr = await supprimerDocumentEleveCore(ctx, r.documentId);
    verdir('A1e suppression document', Boolean(suppr.documentId));
  }

  // ================= A2 — Stats d'absentéisme complètes =================
  {
    const stats = await statsAbsencesCore(ctx, 30);
    const forme = Array.isArray(stats.parJour) && Array.isArray(stats.parSemaine) && Array.isArray(stats.parClasse)
      && Array.isArray(stats.topAbsentéisme) && Array.isArray(stats.topAssiduité)
      && typeof stats.kpi?.tauxAbsentéisme === 'number'
      && typeof stats.parSexe?.garçons === 'number';
    verdir('A2a structure complète du dashboard (KPI, séries, tops, sexes)', forme,
      `taux=${stats.kpi.tauxAbsentéisme}% · ${stats.parJour.length} jours · ${stats.parClasse.length} classes`);

    // Création d'une séance + appel pour avoir des données
    const classe = await db.classe.create({
      data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C`, libelle: `${MARK} Classe Test`, capaciteMax: 30 },
    });
    const matiere = await db.matiere.create({
      data: { ecoleId: ecole.id, code: `${MARK}M`, libelle: `${MARK} Matière Test`, coefficient: 1 },
    });
    const e2 = await db.eleve.create({
      data: { ecoleId: ecole.id, nom: `${MARK}Ndiaye`, prenom: 'Test', sexe: 'F', dateNaissance: new Date('2012-01-01'), dateInscription: new Date(), matricule: `${MARK}001`, classeActuelleId: classe.id },
    });
    const prof = await db.personnel.findFirst({ where: { ecoleId: ecole.id, deletedAt: null } })
      ?? await db.personnel.create({ data: { ecoleId: ecole.id, nom: 'AUDIT28Prof', prenom: 'Test', matricule: 'AUDIT28-P1', dateEmbauche: new Date(), statut: 'actif' } });
    const seance = await db.seance.create({
      data: { classeId: classe.id, matiereId: matiere.id, enseignantId: prof.id, date: new Date(), heureDebut: '08:00', heureFin: '09:00', statut: 'passee' },
    });
    await db.presence.createMany({
      data: [
        { eleveId: e2.id, seanceId: seance.id, statut: 'absent', dateSaisie: new Date(), motifAbsence: 'maladie' },
        { eleveId: eleve.id, seanceId: seance.id, statut: 'present', dateSaisie: new Date() },
      ],
    });
    const stats2 = await statsAbsencesCore(ctx, 30);
    verdir('A2b absences comptées dans les KPI', stats2.kpi.absences >= 1, `absences=${stats2.kpi.absences}`);
    verdir('A2c top absentéisme contient l\'élève absent', stats2.topAbsentéisme.some((t) => t.eleveId === e2.id));
    verdir('A2d répartition filles > 0 (élève F absente)', stats2.parSexe.filles >= 1, `F=${stats2.parSexe.filles}`);
    verdir('A2e parJour non vide', stats2.parJour.length >= 1);

    const notif = await notifierFamillesAbsencesCore(ctx, 1, 30);
    verdir('A2f notification familles (seuil 1) exécutée', typeof notif.famillesNotifiées === 'number', `${notif.famillesNotifiées} notifiée(s)`);

    // Cleanup des données de test A2
    await db.presence.deleteMany({ where: { seanceId: seance.id } });
    await db.seance.delete({ where: { id: seance.id } });
    await db.eleve.delete({ where: { id: e2.id } });
  }

  // ================= A3 — Salles : CRUD + affectation classe =================
  {
    const salle = await db.salle.create({
      data: { ecoleId: ecole.id, nom: `${MARK} A12`, type: 'classe', capacite: 40 },
    });
    const mod = await modifierSalleCore(ctx, salle.id, { capacite: 50 });
    const s2 = await db.salle.findUnique({ where: { id: salle.id } });
    verdir('A3a modification salle (capacité 40→50)', mod.salleId === salle.id && s2?.capacite === 50);

    const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } })
      ?? await db.classe.create({
        data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C2`, libelle: `${MARK} Classe 2`, capaciteMax: 30 },
      });
    const aff = await affecterSalleClasseCore(ctx, classe.id, salle.id);
    const c2 = await db.classe.findUnique({ where: { id: classe.id } });
    verdir('A3b salle principale affectée à la classe', c2?.salleId === salle.id);

    const retrait = await affecterSalleClasseCore(ctx, classe.id, null);
    verdir('A3c retrait de l\'affectation', retrait.salleId === null);

    // Suppression bloquée si séance liée
    const profS = await db.personnel.findFirst({ where: { ecoleId: ecole.id, deletedAt: null } })
      ?? await db.personnel.create({ data: { ecoleId: ecole.id, nom: 'AUDIT28Prof', prenom: 'Test', matricule: 'AUDIT28-P1', dateEmbauche: new Date(), statut: 'actif' } });
    const seanceSalle = await db.seance.create({
      data: { classeId: classe.id, matiereId: (await db.matiere.findFirst({ where: { ecoleId: ecole.id } }))!.id, enseignantId: profS.id, date: new Date(), heureDebut: '10:00', heureFin: '11:00', statut: 'planifiee', salleId: salle.id },
    });
    const bloq = await attenduRefus(() => supprimerSalleCore(ctx, salle.id), 'encore utilisée');
    verdir('A3d suppression salle REFUSÉE si séances liées', bloq);
    await db.seance.delete({ where: { id: seanceSalle.id } });

    const suppr = await supprimerSalleCore(ctx, salle.id);
    verdir('A3e suppression salle une fois libérée', Boolean(suppr.salleId));
    await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  }

  // ================= A4 — Matières : modifier / supprimer =================
  {
    const m = await db.matiere.create({ data: { ecoleId: ecole.id, code: `${MARK}MOD`, libelle: `${MARK} À Modifier`, coefficient: 1 } });
    await modifierMatiereCore(ctx, m.id, { libelle: `${MARK} Modifiée`, coefficient: 3 });
    const m2 = await db.matiere.findUnique({ where: { id: m.id } });
    verdir('A4a modification matière (libellé + coefficient)', m2?.libelle === `${MARK} Modifiée` && m2?.coefficient === 3);

    // Suppression bloquée si évaluation liée
    const classe = await db.classe.create({ data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C3`, libelle: `${MARK} Classe 3` } });
    const profE = await db.personnel.findFirst({ where: { ecoleId: ecole.id, deletedAt: null } });
    const evalLiée = await db.evaluation.create({
      data: { ecoleId: ecole.id, classeId: classe.id, matiereId: m.id, periodeId: periode.id, enseignantId: profE!.id, intitule: `${MARK} eval`, type: 'devoir', date: new Date(), sur: 20, coefficient: 1 },
    });
    const bloq = await attenduRefus(() => supprimerMatiereCore(ctx, m.id), 'encore utilisée');
    verdir('A4b suppression matière REFUSÉE si évaluations liées', bloq);

    await db.evaluation.delete({ where: { id: evalLiée.id } });
    await supprimerMatiereCore(ctx, m.id);
    verdir('A4c suppression matière une fois libérée', true);
    await db.classe.delete({ where: { id: classe.id } });
  }

  // ================= A5 — Chapitre avec période trimestre =================
  {
    const m = await db.matiere.create({ data: { ecoleId: ecole.id, code: `${MARK}PROG`, libelle: `${MARK} Prog`, coefficient: 1 } });
    const prog = await db.programme.create({
      data: { ecoleId: ecole.id, matiereId: m.id, niveauId: niveau.id, anneeScolaireId: annee.id, titre: `${MARK} Programme` },
    });
    const chap = await db.chapitre.create({ data: { programmeId: prog.id, titre: `${MARK} Chapitre 1`, ordre: 1 } });
    await modifierChapitreCore(ctx, chap.id, { titre: `${MARK} Fractions`, ordre: 2, periodeId: periode.id });
    const c2 = await db.chapitre.findUnique({ where: { id: chap.id } });
    verdir('A5a chapitre planifié sur la période (trimestre)', c2?.periodeId === periode.id && c2?.titre === `${MARK} Fractions`);

    const mauvaisePeriode = await db.periode.create({
      data: { ecoleId: ecole.id, anneeScolaireId: (await db.anneeScolaire.create({ data: { ecoleId: ecole.id, libelle: `${MARK} 2030`, dateDebut: new Date('2030-09-01'), dateFin: new Date('2031-07-15'), active: false } })).id, libelle: `${MARK} T1 autre année`, code: 'T1', dateDebut: new Date('2030-09-01'), dateFin: new Date('2030-12-15'), typeBulletin: 'college_lycee' },
    });
    const refuse = await attenduRefus(() => modifierChapitreCore(ctx, chap.id, { periodeId: mauvaisePeriode.id }), 'année scolaire');
    verdir('A5b période d\'une AUTRE année refusée', refuse);

    await supprimerChapitreCore(ctx, chap.id);
    verdir('A5c suppression chapitre', true);
    // A5d : supprimerProgrammeCore via l'action IA équivalente est couvert par le Core
    const { supprimerProgrammeCore } = await import('../src/lib/business');
    await supprimerProgrammeCore(ctx, prog.id);
    verdir('A5d suppression programme (avec chapitres nettoyés)', true);
    await db.matiere.delete({ where: { id: m.id } });
    await db.periode.deleteMany({ where: { libelle: { startsWith: MARK } } });
    await db.anneeScolaire.deleteMany({ where: { ecoleId: ecole.id, libelle: { startsWith: MARK } } });
  }

  // ================= A6 — Dépense validée → écriture SYSCOHADA =================
  {
    // Plan comptable minimal (caisse, banque, clients, charges, journal ACH) :
    // l'écriture automatique est silencieuse si le plan n'est pas initialisé.
    const planMinimal = await (async () => {
      const existant = await db.compteComptable.count({ where: { ecoleId: ecole.id, numero: { in: ['571', '601'] } } });
      if (existant >= 2) return false;
      await db.compteComptable.createMany({
        data: [
          { ecoleId: ecole.id, numero: '571', libelle: 'Caisse', type: 'actif', devise: 'XOF' },
          { ecoleId: ecole.id, numero: '521', libelle: 'Banque', type: 'actif', devise: 'XOF' },
          { ecoleId: ecole.id, numero: '411', libelle: 'Clients', type: 'actif', devise: 'XOF' },
          { ecoleId: ecole.id, numero: '601', libelle: 'Achats', type: 'charge', devise: 'XOF' },
        ],
      });
      const codesJ = ['ACH', 'VE', 'OD'];
      for (const cj of codesJ) {
        await db.journalComptable.create({ data: { ecoleId: ecole.id, code: cj, libelle: cj === 'ACH' ? 'Achats' : cj === 'VE' ? 'Ventes' : 'Opérations diverses', type: cj === 'ACH' ? 'achat' : cj === 'VE' ? 'vente' : 'operations_diverses' } }).catch(() => undefined);
      }
      return true;
    })();

    const dep = await enregistrerDepenseCore(ctx, ecole.id, {
      categorie: `${MARK} Fournitures`, description: 'Test écriture automatique', montant: 250_000, // 2 500 XOF
      dateDepense: new Date(), fournisseur: 'Fournisseur Test',
    });
    // Un AUTRE validateur que le saisisseur (séparation des tâches)
    const autre = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, id: { not: dir.id } } })
      ?? await db.utilisateur.findFirst({ where: { ecoleId: { not: ecole.id } } });
    if (autre) {
      const ctxVal: Ctx = { utilisateurId: autre.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(['finances.valider', 'finances.ecrire']) };
      const sepTaches = await attenduRefus(() => validerDepenseCore(ctx, dep.depenseId), 'séparation des tâches');
      verdir('A6a saisisseur ≠ validateur (refus auto-validation)', sepTaches);
      await validerDepenseCore(ctxVal, dep.depenseId);
    } else {
      // super_admin bypass la séparation
      const superCtx: Ctx = { utilisateurId: dir.id, ecoleId: ecole.id, type: 'super_admin', permissions: new Set() };
      await validerDepenseCore(superCtx, dep.depenseId);
    }
    const ecriture = await db.ecritureComptable.findFirst({ where: { ecoleId: ecole.id, numeroPiece: `DEP-${dep.depenseId.slice(-10)}` }, include: { lignes: true } });
    const equilibre = ecriture ? Math.abs(ecriture.lignes.reduce((s, l) => s + l.debit - l.credit, 0)) === 0 : false;
    const aUneLigneCharge = ecriture?.lignes.some((l) => l.debit > 0) ?? false;
    const aUneLigneTreso = ecriture?.lignes.some((l) => l.credit > 0) ?? false;
    verdir('A6b écriture SYSCOHADA générée à la validation', Boolean(ecriture), ecriture?.numeroPiece ?? `AUCUNE (plan minimal initialisé : ${planMinimal})`);
    verdir('A6c partie double équilibrée (débit = crédit)', equilibre);
    verdir('A6d charge au débit + trésorerie au crédit', aUneLigneCharge && aUneLigneTreso);
  }

  // ---------- Nettoyage final ----------
  await db.depense.deleteMany({ where: { ecoleId: ecole.id, categorie: { startsWith: MARK } } });
  await db.ligneEcriture.deleteMany({ where: { ecriture: { ecoleId: ecole.id, libelle: { startsWith: `Dépense ${MARK}` } } } });
  await db.ecritureComptable.deleteMany({ where: { ecoleId: ecole.id, numeroPiece: { startsWith: 'DEP-' }, libelle: { startsWith: `Dépense ${MARK}` } } });
  await db.documentEleve.deleteMany({ where: { nomFichier: { startsWith: MARK } } });
  await db.salle.deleteMany({ where: { ecoleId: ecole.id, nom: { startsWith: MARK } } });
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
  if (eleveACreer) {
    await db.pieceDossier.deleteMany({ where: { eleveId: eleve.id } });
    await db.eleve.delete({ where: { id: eleve.id } });
  }

  const echecs = results.filter((r) => r.verdict === 'FAIL').length;
  console.log(`\n===== ${results.length - echecs}/${results.length} PASS =====`);
  if (echecs > 0) {
    console.table(results.filter((r) => r.verdict === 'FAIL'));
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('ERREUR TEST :', e); process.exitCode = 1; });
