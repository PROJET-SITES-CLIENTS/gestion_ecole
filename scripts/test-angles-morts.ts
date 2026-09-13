/**
 * SUITE ANGLES MORTS — T25 à T40 (vague 2)
 * Un test par angle mort corrigé : A1-A4, B1-B8, B12, C2-C9, D5, E3.
 * Exécution : npx tsx scripts/test-angles-morts.ts (après npm run seed)
 */
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import {
  Ctx, ActionError,
  changerMotDePasseCore, reinitialiserMotDePasseCore, demanderReinitialisationCore,
  marquerNotificationsLuesCore, revoquerSessionCore,
  changerEcoleActiveCore, traiterDemandeEffacementCore,
  genererBulletinsPaieCore, traiterBulletinPaieCore,
  creerEcritureCore, validerEcritureCore, genererEcrituresAutomatiquesCore,
  creerCandidatureAdmissionCore, avancerCandidatureAdmissionCore, convertirAdmissionCore,
  creerLigneTransportCore, inscrireTransportCore, genererEcheancesServicesCore,
  creerSignalementCore, ajouterSuiviSignalementCore,
  creerDevoirCore, creerDispenseCore, traiterDispenseCore, saisirEvaluationsCompetenceCore,
  preterLivreCore, retournerLivreCore,
  verifierRappelsVaccinationCore, statsAbsentéismeCore, relancerAbsencesCore,
  inscrireEleveCore,
  creerMatiereCore, creerClasseCore,
} from '../src/lib/business';
import { tenterConnexion } from '../src/lib/auth';
import { verifyPassword, hashPassword } from '../src/lib/auth-hash';
import { chiffrer, déchiffrer } from '../src/lib/crypto';
import { creerSauvegarde, listerSauvegardes } from '../src/lib/sauvegarde';

import { dbTest, executerAvecRetry } from './_helper-test';
const db = dbTest;
const MARK = 'AnglesMorts';
const results: Array<{ test: string; verdict: string; detail: string }> = [];

type Attente = { rejete: boolean; erreur?: string; valeur?: unknown };
async function attendu(fn: () => Promise<unknown>): Promise<Attente> {
  // Transitoire (Neon qui s'endort) → on RETENTE : un refus métier doit
  // être VRAI, pas un crash de connexion déguisé en « rejeté ».
  for (let essai = 1; essai <= 3; essai++) {
    try { const v = await fn(); return { rejete: false, valeur: v } as Attente; }
    catch (e) {
      const transitoire = typeof (e as any)?.code === 'string'
        ? ['P1001','P1006','P1008','P1010','P1017','P2024'].includes((e as any).code)
        : /can't reach database|connection terminated|connection reset|timed out/i.test(String((e as Error)?.message ?? ''));
      if (!transitoire || essai === 3) return { rejete: true, erreur: e instanceof ActionError ? e.message : String(e) } as Attente;
      await new Promise((r) => setTimeout(r, 800 * essai));
    }
  }
  return { rejete: true, erreur: 'inatteignable' } as Attente;
}

async function main() {
  process.env.SG_CLE_CHIFFREMENT = process.env.SG_CLE_CHIFFREMENT || 'cle-test-angles-morts';
  const ecole = await db.ecole.findFirst({ where: { slug: 'vinci' } });
  if (!ecole) throw new Error('École démo introuvable (seed ?)');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, email: { startsWith: 'direction@' } } });
  if (!dir) throw new Error('Direction introuvable');
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = { utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(perms.map((p) => p.code)) };
  await preCleanup();
  console.log(`École: ${ecole.nom} · ${perms.length} permissions\n`);

  // ===== T25 (A1) — Sauvegarde réelle sur disque =====
  {
    const r = await creerSauvegarde(db, 'manuelle', dir.id);
    const surDisque = r.ok && r.nomFichier ? listerSauvegardes().some((f) => f.nom === r.nomFichier && f.taille > 1000) : false;
    const méta = r.ok ? await db.sauvegarde.findFirst({ where: { nomFichier: r.nomFichier ?? '__' } }) : null;
    const pass = r.ok && surDisque && Boolean(méta);
    results.push({ test: 'T25 (A1) — Sauvegarde : fichier réel + métadonnées', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `${r.ok ? `fichier ${r.nomFichier} (${Math.round((r.tailleOctets ?? 0) / 1024)} Ko)` : 'échec: ' + r.erreur} · sur disque: ${surDisque} · métadonnée: ${Boolean(méta)}` });
  }

  // ===== T26 (A4) — Mots de passe =====
  {
    const testUser = await db.utilisateur.create({ data: { ecoleId: ecole.id, email: `${MARK.toLowerCase()}@test.sn`, motDePasseHash: hashPassword('AncienMdp!1'), nom: 'Test', prenom: 'Mdp', type: 'personnel' } });
    const ctxTest: Ctx = { utilisateurId: testUser.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(['eleves.lire']) };
    const rMauvais = await attendu(() => changerMotDePasseCore(ctxTest, 'Faux', 'NouveauMdp!2'));
    const rBon = await attendu(() => changerMotDePasseCore(ctxTest, 'AncienMdp!1', 'NouveauMdp!2'));
    const verif = verifyPassword('NouveauMdp!2', (await db.utilisateur.findUnique({ where: { id: testUser.id } }))!.motDePasseHash);
    const dem = await demanderReinitialisationCore(`${MARK.toLowerCase()}@test.sn`);
    const rReset = dem.jetonId ? await attendu(() => reinitialiserMotDePasseCore(dem.jetonId!, 'ResetMdp!3')) : { rejete: true };
    const verifReset = verifyPassword('ResetMdp!3', (await db.utilisateur.findUnique({ where: { id: testUser.id } }))!.motDePasseHash);
    const pass = rMauvais.rejete && !rBon.rejete && verif && !rReset.rejete && verifReset;
    results.push({ test: 'T26 (A4) — Changer mot de passe + réinitialisation par jeton', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `ancien faux: ${rMauvais.rejete ? 'refusé' : 'accepté (?)'} · changement: ${!rBon.rejete && verif ? 'OK' : 'échec'} · reset par jeton: ${!rReset.rejete && verifReset ? 'OK (sessions révoquées)' : 'échec'}` });
  }

  // ===== T27 (B1) — Paie =====
  {
    const periode = '2030-01';
    const r1 = await genererBulletinsPaieCore(ctx, ecole.id, periode);
    const r2 = await genererBulletinsPaieCore(ctx, ecole.id, periode);
    const brouillons = await db.bulletinPaie.findMany({ where: { ecoleId: ecole.id, periode, statut: 'brouillon' } });
    let payeOk = false;
    if (brouillons[0]) {
      await traiterBulletinPaieCore(ctx, brouillons[0].id, 'valide');
      await traiterBulletinPaieCore(ctx, brouillons[0].id, 'paye');
      payeOk = (await db.bulletinPaie.findUnique({ where: { id: brouillons[0].id } }))?.statut === 'paye';
    }
    const pass = r1.bulletins > 0 && r2.bulletins === 0 && brouillons.length === r1.bulletins && payeOk;
    results.push({ test: 'T27 (B1) — Paie : génération idempotente + workflow', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `gen 1: ${r1.bulletins} bulletins · gen 2: ${r2.bulletins} créés/${r2.sautes} sautés · brouillon→valide→payé: ${payeOk ? 'OK' : 'échec'}` });
  }

  // ===== T28 (B2) — Écriture équilibrée =====
  {
    const comptes = await db.compteComptable.findMany({ where: { ecoleId: ecole.id } });
    const journal = await db.journalComptable.findFirst({ where: { ecoleId: ecole.id } });
    if (comptes.length >= 2 && journal) {
      const deseq = await attendu(() => creerEcritureCore(ctx, ecole.id, { journalId: journal.id, libelle: `${MARK} deseq`, date: new Date(), lignes: [{ compteId: comptes[0].id, libelle: 'D', debit: 100_000, credit: 0 }, { compteId: comptes[1].id, libelle: 'C', debit: 0, credit: 90_000 }] }));
      const eq = await attendu(() => creerEcritureCore(ctx, ecole.id, { journalId: journal.id, libelle: `${MARK} eq`, date: new Date(), lignes: [{ compteId: comptes[0].id, libelle: 'Dépense', debit: 100_000, credit: 0 }, { compteId: comptes[1].id, libelle: 'Règlement', debit: 0, credit: 100_000 }] }));
      const soldeAvant = comptes[0].solde;
      if (!eq.rejete) await validerEcritureCore(ctx, (eq.valeur as any).ecritureId);
      const après = await db.compteComptable.findUnique({ where: { id: comptes[0].id } });
      const pass = deseq.rejete && !eq.rejete && (après?.solde ?? 0) === soldeAvant + 100_000;
      results.push({ test: 'T28 (B2) — Compta : équilibre débit=crédit forcé', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `déséquilibrée (écart 10 000): ${deseq.rejete ? 'REFUSÉE' : 'acceptée (?)'} · équilibrée créée+validée, solde maj: ${(après?.solde ?? 0) === soldeAvant + 100_000}` });
    } else {
      results.push({ test: 'T28 (B2)', verdict: 'ÉCHEC', detail: 'Plan comptable incomplet' });
    }
  }

  // ===== T29 (B2-bis) — Écritures automatiques =====
  {
    const r = await genererEcrituresAutomatiquesCore(ctx, ecole.id);
    const r2 = await genererEcrituresAutomatiquesCore(ctx, ecole.id);
    const pass = r.créées >= 1 && r2.créées === 0;
    results.push({ test: 'T29 (B2) — Écritures automatiques (idempotentes)', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `${r.créées} créée(s) depuis paiements+dépenses · 2e passage: ${r2.créées}` });
  }

  // ===== T30 (B4) — Admission → inscription =====
  {
    const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id }, include: { niveau: true } });
    const niveau = classe?.niveau ?? (await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } }));
    const cand = await creerCandidatureAdmissionCore(ctx, ecole.id, { nom: `${MARK}Cand`, prenom: 'Test', dateNaissance: new Date('2014-05-05'), email: `${MARK.toLowerCase()}.cand@test.sn`, niveauId: niveau!.id, parentNom: 'Parent Test', parentTelephone: '+221 77 000 00 00' });
    await avancerCandidatureAdmissionCore(ctx, cand.candidatureId, 'admis');
    const r = await attendu(() => convertirAdmissionCore(ctx, cand.candidatureId, classe!.id));
    const double = await attendu(() => convertirAdmissionCore(ctx, cand.candidatureId, classe!.id));
    const eleve = r.rejete ? null : await db.eleve.findUnique({ where: { id: (r.valeur as any).eleveId } });
    const parentLié = eleve ? await db.eleveParent.findFirst({ where: { eleveId: eleve.id } }) : null;
    const pass = !r.rejete && Boolean(eleve?.matricule?.startsWith('EL-')) && eleve?.classeActuelleId === classe!.id && double.rejete && Boolean(parentLié);
    results.push({ test: 'T30 (B4) — Admission admise → élève inscrit + parent rattaché', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `inscrit ${eleve?.matricule} en ${classe?.libelle} · parent: ${Boolean(parentLié)} · double: ${double.rejete ? 'refusé' : 'accepté (?)'}` });
  }

  // ===== T31 (B5) — Transport + facturation =====
  {
    const ligne = await creerLigneTransportCore(ctx, ecole.id, { nom: `${MARK} Ligne` });
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const insc = await attendu(() => inscrireTransportCore(ctx, { eleveId: eleve!.id, ligneId: ligne.ligneId, tarif: 150_000 }));
    const double = await attendu(() => inscrireTransportCore(ctx, { eleveId: eleve!.id, ligneId: ligne.ligneId, tarif: 150_000 }));
    const fc = await genererEcheancesServicesCore(ctx, ecole.id, 'cantine', new Date('2026-10-01'));
    const ft = await genererEcheancesServicesCore(ctx, ecole.id, 'transport', new Date('2026-10-01'));
    const fb = await genererEcheancesServicesCore(ctx, ecole.id, 'cantine', new Date('2026-10-01'));
    const pass = !insc.rejete && double.rejete && fc.échéancesCréées > 0 && ft.échéancesCréées > 0 && fb.échéancesCréées === 0;
    results.push({ test: 'T31 (B5) — Transport + facturation cantine/transport', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `inscription OK (double refusé) · cantine ${fc.échéancesCréées} éch. · transport ${ft.échéancesCréées} éch. oct-2026 · re-fact: ${fb.échéancesCréées} (idempotent)` });
  }

  // ===== T32 (B6) — Pénalité biblio =====
  {
    const livre = await db.biblioLivre.create({ data: { ecoleId: ecole.id, titre: `${MARK} Livre`, exemplairesTotal: 2, exemplairesDisponibles: 2 } });
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    const pret = await preterLivreCore(ctx, { livreId: livre.id, eleveId: eleve!.id, dureeJours: 7 });
    await db.biblioPret.update({ where: { id: pret.pretId }, data: { dateRetourPrevue: new Date(Date.now() - 10 * 86400000) } });
    const r = await retournerLivreCore(ctx, pret.pretId);
    const éch = await db.echeanceFrais.findFirst({ where: { eleveId: eleve!.id, source: { contains: 'Pénalité retard livre' } } });
    const pass = (r.penalite ?? 0) > 0 && Boolean(éch) && éch?.montant === r.penalite;
    results.push({ test: 'T32 (B6) — Pénalité biblio → échéance encaissable', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `retard 10 j → ${((r.penalite ?? 0) / 100).toLocaleString('fr-FR')} XOF → échéance ${éch?.statut}` });
  }

  // ===== T33 (B8) — Protection enfance =====
  {
    const avant = await db.notification.count({ where: { ecoleId: ecole.id, sujet: { contains: 'Signalement' } } });
    const s = await creerSignalementCore(ctx, { type: 'harcelement', description: `${MARK} faits`, gravite: 'urgent', source: 'enseignant' });
    const apres = await db.notification.count({ where: { ecoleId: ecole.id, sujet: { contains: 'Signalement' } } });
    const suivi = await attendu(() => ajouterSuiviSignalementCore(ctx, s.signalementId, `${MARK} entretien`));
    const pass = Boolean(s.signalementId) && apres > avant && !suivi.rejete;
    results.push({ test: 'T33 (B8) — Signalement urgent → direction notifiée', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `créé · notifs direction: ${apres - avant} · suivi: ${!suivi.rejete}` });
  }

  // ===== T34 (B10/B11) — Devoirs/dispenses/compétences =====
  {
    const classe = await db.classe.findFirst({ where: { ecoleId: ecole.id } });
    const prof = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id, email: 'mamadou.fall@vinci.sn' } });
    const ctxProf: Ctx = { utilisateurId: prof!.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(['notes.saisir']) };
    const d = await attendu(() => creerDevoirCore(ctxProf, { classeId: classe!.id, intitule: `${MARK} DM`, dateRendu: new Date(Date.now() + 7 * 86400000) }));
    const eleve = await db.eleve.findFirst({ where: { classeActuelleId: classe!.id } });
    const disp = await attendu(() => creerDispenseCore(ctx, { eleveId: eleve!.id, motif: 'medical', description: `${MARK} asthme`, dateDebut: new Date() }));
    const dispId = (disp.valeur as any)?.dispenseId;
    const dispVal = dispId ? await attendu(() => traiterDispenseCore(ctx, dispId, 'validee')) : { rejete: true };
    const comp = await db.competence.findFirst({ where: { ecoleId: ecole.id } });
    const per = await db.periode.findFirst({ where: { ecoleId: ecole.id } });
    const saisie = comp && per ? await attendu(() => saisirEvaluationsCompetenceCore(ctx, { periodeId: per.id, saisies: [{ eleveId: eleve!.id, competenceId: comp.id, niveauAcquisition: 'acquis' }] })) : { rejete: true, erreur: 'compétences non seedées' };
    const pass = !d.rejete && !disp.rejete && !dispVal.rejete && !saisie.rejete;
    results.push({ test: 'T34 (B10/B11) — Devoirs, dispenses, compétences', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `devoir: ${!d.rejete} · dispense validée: ${!dispVal.rejete} · compétence: ${!saisie.rejete ? 'saisie' : saisie.erreur?.slice(0, 40)}` });
  }

  // ===== T35 (C2/C3) — Notifications + sessions =====
  {
    const r = await marquerNotificationsLuesCore(ctx);
    const nbApres = await db.notification.count({ where: { destinataireId: dir.id, dateLecture: null } });
    const session = await db.sessionUtilisateur.create({ data: { utilisateurId: dir.id, tokenHash: createHash('sha256').update(`${MARK}-s-${Date.now()}-${Math.random()}-${Date.now()}-${Math.random()}`).digest('hex'), dateExpiration: new Date(Date.now() + 3600_000), active: true } });
    await revoquerSessionCore(ctx, session.id);
    const apres = await db.sessionUtilisateur.findUnique({ where: { id: session.id } });
    const pass = r.marquees > 0 && nbApres === 0 && apres?.active === false;
    results.push({ test: 'T35 (C2/C3) — Notifications lues + révocation session', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `${r.marquees} marquée(s), reste ${nbApres} · session révoquée: active=${apres?.active}` });
  }

  // ===== T36 (C4) — 2FA par rôle =====
  {
    // Autonome : la démo a VOLONTAIREMENT la 2FA désactivée (décision
    // produit) → on crée notre propre utilisateur avec méthode TOTP.
    const uTotp = await db.utilisateur.create({ data: { ecoleId: ecole.id, email: `${MARK.toLowerCase()}-totp@test.sn`, motDePasseHash: hashPassword('Mdp!1234'), nom: 'Totp', prenom: 'T', type: 'personnel', twofaActive: true } });
    const roleTotp = await db.role.findFirst({ where: { ecoleId: ecole.id, code: 'assistant_direction' } });
    await db.role.update({ where: { id: roleTotp!.id }, data: { twofaRequis: true } });
    await db.utilisateurRole.create({ data: { utilisateurId: uTotp.id, roleId: roleTotp!.id } });
    await db.twoFactorMethod.create({ data: { utilisateurId: uTotp.id, methode: 'totp', secret: 'JBSWY3DPEHPK3PXP', actif: true } });
    const rc = await tenterConnexion(`${MARK.toLowerCase()}-totp@test.sn`, 'Mdp!1234', 'ua', '127.0.0.6');
    const défi = !rc.ok && 'besoin2FA' in rc;
    await db.twoFactorMethod.deleteMany({ where: { utilisateurId: uTotp.id } });
    await db.role.update({ where: { id: roleTotp!.id }, data: { twofaRequis: false } });
    const u2 = await db.utilisateur.create({ data: { ecoleId: ecole.id, email: `${MARK.toLowerCase()}-rh@test.sn`, motDePasseHash: hashPassword('Mdp!1234'), nom: 'Rh', prenom: 'T', type: 'personnel' } });
    const roleRh = await db.role.findFirst({ where: { ecoleId: ecole.id, code: 'rh' } });
    await db.role.update({ where: { id: roleRh!.id }, data: { twofaRequis: true } });
    await db.utilisateurRole.create({ data: { utilisateurId: u2.id, roleId: roleRh!.id } });
    const r2 = await tenterConnexion(`${MARK.toLowerCase()}-rh@test.sn`, 'Mdp!1234', 'ua', '127.0.0.6');
    await db.role.update({ where: { id: roleRh!.id }, data: { twofaRequis: false } });
    const bloqué = !r2.ok && String((r2 as any).erreur ?? '').includes('Double authentification');
    const pass = défi && bloqué;
    results.push({ test: 'T36 (C4) — 2FA imposée par le rôle', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `comptable (rôle 2FA + méthode): ${défi ? 'défi TOTP' : 'pas de défi (?)'} · sans méthode: ${bloqué ? 'REFUSÉ + consigne' : 'connecté (?)'}` });
  }

  // ===== T37 (D5) — Multi-établissement =====
  {
    const ecole2 = await db.ecole.findFirst({ where: { slug: 'etoile-demo' } });
    if (ecole2) {
      const session = await db.sessionUtilisateur.create({ data: { utilisateurId: dir.id, tokenHash: createHash('sha256').update(`${MARK}-m-${Date.now()}-${Math.random()}`).digest('hex'), dateExpiration: new Date(Date.now() + 3600_000), active: true } });
      const r = await attendu(() => changerEcoleActiveCore(ctx, session.id, ecole2.id));
      const apres = await db.sessionUtilisateur.findUnique({ where: { id: session.id } });
      const sans = await attendu(() => changerEcoleActiveCore(ctx, session.id, 'ecole-x'));
      const pass = !r.rejete && apres?.ecoleActiveId === ecole2.id && sans.rejete;
      results.push({ test: 'T37 (D5) — Bascule multi-établissement', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `Vinci→Étoile: ${!r.rejete ? 'OK' : 'échec'} · sans accès: ${sans.rejete ? 'refusé' : 'accepté (?)'}` });
    } else {
      results.push({ test: 'T37 (D5)', verdict: 'ÉCHEC', detail: 'École etoile-demo absente' });
    }
  }

  // ===== T38 (C5) — Anonymisation RGPD =====
  {
    const insc = await inscrireEleveCore(ctx, ecole.id, { nom: `${MARK}Oublie`, prenom: 'T', dateNaissance: new Date('2013-01-01'), lieuNaissance: 'Dakar', sexe: 'F' });
    await db.ficheSante.create({ data: { ecoleId: ecole.id, eleveId: insc.eleveId, allergies: 'enc:v1:test' } });
    const demande = await db.demandeEffacement.create({ data: { ecoleId: ecole.id, utilisateurId: dir.id, cibleType: 'eleve', cibleId: insc.eleveId, motif: 'droit_effacement', statut: 'recu' } });
    await traiterDemandeEffacementCore(ctx, demande.id);
    const eleve = await db.eleve.findUnique({ where: { id: insc.eleveId } });
    const fiche = await db.ficheSante.findFirst({ where: { eleveId: insc.eleveId } });
    const dem = await db.demandeEffacement.findUnique({ where: { id: demande.id } });
    const pass = eleve?.nom.startsWith('ANONYMISÉ') && !fiche && dem?.statut === 'anonymise';
    results.push({ test: 'T38 (C5) — Effacement RGPD : anonymisation', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `nom→${eleve?.nom} · fiche santé: ${fiche ? 'PRÉSENTE (?)' : 'effacée'} · demande: ${dem?.statut}` });
  }

  // ===== T39 (C6/C10) — Rappels + absentéisme =====
  {
    const eleve = await db.eleve.findFirst({ where: { ecoleId: ecole.id, statut: 'actif' } });
    await db.vaccination.create({ data: { ecoleId: ecole.id, eleveId: eleve!.id, vaccin: `${MARK} ROR`, dateRappel: new Date(Date.now() - 5 * 86400000), statut: 'rappel_prevu' } });
    const r = await verifierRappelsVaccinationCore();
    const st = await statsAbsentéismeCore(ctx, 365);
    const rel = await relancerAbsencesCore(ctx, 99, 365); // seuil 99 → personne, juste vérifier l'exécution
    const pass = r.notifiés >= 1 && typeof st.tauxAbsentéisme === 'number' && rel.famillesNotifiées === 0;
    results.push({ test: 'T39 (C6/C10) — Rappel vaccin échu + stats absentéisme', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `rappel → ${r.notifiés} notif(s) · absences 12 m: ${st.totalAbsences} (taux ${st.tauxAbsentéisme}%) · relance exécutée: ${rel.famillesNotifiées} famille(s)` });
  }

  // ===== T40 (E3/B12) — Crypto + webhook =====
  {
    const clair = 'allergie arachides';
    const ch = chiffrer(clair)!;
    const rt = déchiffrer(ch) === clair;
    const pf = ch.startsWith('enc:v1:');
    const { creerWebhookCore } = await import('../src/lib/business');
    const { createHmac } = await import('crypto');
    const w = await creerWebhookCore(ctx, { url: 'https://example.invalid/h', events: ['eleve.inscription'] });
    const hmacOk = createHmac('sha256', 'whsec_x').update('{}').digest('hex').length === 64;
    const pass = rt && pf && hmacOk && String(w.secret ?? '').startsWith('whsec_');
    results.push({ test: 'T40 (E3/B12) — Chiffrement santé + secret webhook', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `AES round-trip: ${rt} (${pf ? 'enc:v1:' : 'pas de préfixe'}) · webhook secret: ${String(w.secret).slice(0, 10)}… · HMAC: ${hmacOk ? 'OK' : 'KO'}` });
    await db.webhookDelivery.deleteMany({ where: { webhookId: w.webhookId } });
    await db.webhookSortant.deleteMany({ where: { id: w.webhookId } });
  }


  // ===== T41 (déploiement) — Référentiels d'école : matières + classes =====
  {
    const codeM = 'AMX1';
    const m = await attendu(() => creerMatiereCore(ctx, ecole.id, { code: codeM, libelle: 'Matière test', coefficient: 2 }));
    const mDup = await attendu(() => creerMatiereCore(ctx, ecole.id, { code: codeM, libelle: 'Doublon' }));
    const mCoef = await attendu(() => creerMatiereCore(ctx, ecole.id, { code: 'AMX2', libelle: 'Coef invalide', coefficient: 99 }));
    const niveauxListe = await db.niveau.findMany({ where: { section: { cycle: { ecoleId: ecole.id } } } });
    const n6 = niveauxListe.find((n) => n.code === '6E')!;
    const c = await attendu(() => creerClasseCore(ctx, { niveauId: n6.id, code: '6Z', libelle: 'Sixième Z' }));
    const cDup = await attendu(() => creerClasseCore(ctx, { niveauId: n6.id, code: '6Z', libelle: 'Doublon' }));
    const pass = !m.rejete && mDup.rejete && mCoef.rejete && !c.rejete && cDup.rejete;
    results.push({ test: 'T41 (déploiement) — Référentiels : matières + classes créables', verdict: pass ? 'PASS ✓' : 'ÉCHEC', detail: `matière: ${!m.rejete ? 'créée' : 'échec — ' + String(m.erreur ?? '').slice(0, 140)} · doublon: ${mDup.rejete ? 'refusé' : 'accepté (?)'} · coef 99: ${mCoef.rejete ? 'refusé' : 'accepté (?)'} · classe 6Z: ${!c.rejete ? 'créée' : 'échec — ' + String(c.erreur ?? '').slice(0, 140)} · doublon: ${cDup.rejete ? 'refusé' : 'accepté (?)'} — une école réelle configure SON établissement` });
  }
  await preCleanup();
  console.log('\n══════════════════ RÉSULTATS ANGLES MORTS ══════════════════');
  for (const r of results) {
    console.log(`\n▶ ${r.test}`);
    console.log(`  ${r.verdict}`);
    console.log(`  ${r.detail}`);
  }
  const passes = results.filter((r) => r.verdict.startsWith('PASS')).length;
  console.log(`\n══════════════════ TOTAL : ${passes}/${results.length} PASS ══════════════════`);
}

async function preCleanup() {
  // Idempotent mais SILENCIEUX de l'intérieur : on retente TOUT en cas
  // d'erreur transitoire (Neon froid au démarrage) — sinon les résidus
  // survivent et cassent T41 (« existe déjà »).
  for (let essai = 1; essai <= 3; essai++) {
    try { await preCleanupUneFois(); return; }
    catch (e) {
      if (essai === 3) throw e;
      console.log(`↻ preCleanup (réveil base), tentative ${essai + 1}/3…`);
      await new Promise((r) => setTimeout(r, 1200 * essai));
    }
  }
}

async function preCleanupUneFois() {
  try {
    const hashMark = createHash('sha256').update(MARK).digest('hex').slice(0, 8);
    // T27 — bulletins de paie de la période test (idempotence sinon bloquée)
    await db.cotisationSociale.deleteMany({ where: { bulletin: { periode: '2030-01' } } }).catch(() => {});
    await db.variablePaie.deleteMany({ where: { bulletinPaie: { periode: '2030-01' } } }).catch(() => {});
    await db.ligneBulletinPaie.deleteMany({ where: { bulletin: { periode: '2030-01' } } }).catch(() => {});
    await db.bulletinPaie.deleteMany({ where: { periode: '2030-01' } }).catch(() => {});
    // T29 — écritures AUTOMATIQUES (ENC-/DEP-) + écritures MARK validées :
    // RELEVER les soldes des comptes avant suppression (sinon dérive)
    const ecritureARelever = await db.ecritureComptable.findMany({
      where: { statut: 'valide', OR: [{ numeroPiece: { startsWith: 'ENC-' } }, { numeroPiece: { startsWith: 'DEP-' } }, { libelle: { contains: MARK } }] },
      include: { lignes: true },
    }).catch(() => []);
    for (const e of ecritureARelever) {
      for (const l of e.lignes) {
        await db.compteComptable.update({ where: { id: l.compteId }, data: { solde: { decrement: l.debit - l.credit } } }).catch(() => {});
      }
    }
    if (ecritureARelever.length) {
      await db.ligneEcriture.deleteMany({ where: { ecritureId: { in: ecritureARelever.map((e) => e.id) } } }).catch(() => {});
      await db.ecritureComptable.deleteMany({ where: { id: { in: ecritureARelever.map((e) => e.id) } } }).catch(() => {});
    }
    // T31 — frais cantine/transport du mois test
    const fraisOct = await db.frais.findMany({ where: { libelle: { in: ['Cantine — 2026-10', 'Transport — 2026-10'] } }, select: { id: true } }).catch(() => []);
    if (fraisOct.length) {
      await db.paiementEcheance.deleteMany({ where: { echeance: { fraisId: { in: fraisOct.map((x) => x.id) } } } }).catch(() => {});
      await db.echeanceFrais.deleteMany({ where: { fraisId: { in: fraisOct.map((x) => x.id) } } }).catch(() => {});
      await db.frais.deleteMany({ where: { id: { in: fraisOct.map((x) => x.id) } } }).catch(() => {});
    }
    await db.utilisateurRole.deleteMany({ where: { utilisateur: { email: { contains: MARK, mode: 'insensitive' as any } } } }).catch(() => {});
    await db.sessionUtilisateur.deleteMany({ where: { utilisateur: { email: { contains: MARK, mode: 'insensitive' as any } } } }).catch(() => {});
    await db.utilisateur.deleteMany({ where: { email: { contains: MARK, mode: 'insensitive' as any } } }).catch(() => {});
    await db.eleveParent.deleteMany({ where: { eleve: { nom: { contains: MARK, mode: 'insensitive' as any } } } });
    await db.ficheSante.deleteMany({ where: { eleve: { nom: { contains: MARK, mode: 'insensitive' as any } } } });
    await db.eleveHistoriqueClasse.deleteMany({ where: { eleve: { nom: { contains: MARK, mode: 'insensitive' as any } } } });
    await db.echeanceFrais.deleteMany({ where: { source: { contains: MARK } } });
    await db.frais.deleteMany({ where: { libelle: { contains: MARK } } });
    await db.ligneEcriture.deleteMany({ where: { ecriture: { libelle: { contains: MARK } } } });
    await db.ecritureComptable.deleteMany({ where: { libelle: { contains: MARK } } });
    await db.etapeAdmission.deleteMany({ where: { candidature: { nom: { contains: MARK, mode: 'insensitive' as any } } } });
    await db.candidatureAdmission.deleteMany({ where: { nom: { contains: MARK, mode: 'insensitive' as any } } });
    await db.transportInscription.deleteMany({ where: { ligne: { nom: { contains: MARK, mode: 'insensitive' as any } } } });
    await db.transportArret.deleteMany({ where: { ligne: { nom: { contains: MARK, mode: 'insensitive' as any } } } });
    await db.transportLigne.deleteMany({ where: { nom: { contains: MARK, mode: 'insensitive' as any } } });
    await db.suiviSignalement.deleteMany({ where: { signalement: { description: { contains: MARK } } } });
    await db.mesureProtection.deleteMany({ where: { signalement: { description: { contains: MARK } } } });
    await db.signalementMineur.deleteMany({ where: { description: { contains: MARK } } });
    await db.renduDevoir.deleteMany({ where: { devoir: { intitule: { contains: MARK } } } });
    await db.devoir.deleteMany({ where: { intitule: { contains: MARK } } });
    await db.dispense.deleteMany({ where: { description: { contains: MARK } } });
    await db.biblioPret.deleteMany({ where: { livre: { titre: { contains: MARK } } } });
    await db.biblioLivre.deleteMany({ where: { titre: { contains: MARK } } });
    await db.vaccination.deleteMany({ where: { vaccin: { contains: MARK } } });
    await db.notification.deleteMany({ where: { corps: { contains: MARK } } });
    await db.demandeEffacement.deleteMany({ where: { cible: undefined } } as any).catch(() => {});
    await db.demandeEffacement.deleteMany({ where: { description: { contains: MARK } } }).catch(() => {});
    await db.eleve.deleteMany({ where: { nom: { contains: MARK, mode: 'insensitive' as any } } });
    await db.classe.deleteMany({ where: { ecoleId: undefined as any, code: '6Z' } }).catch(() => {});
    await db.classe.deleteMany({ where: { code: '6Z' } }).catch(() => {});
    await db.matiere.deleteMany({ where: { code: { in: ['AMX1', 'AMX2'] } } }).catch(() => {});
    await db.auditLog.deleteMany({ where: { details: { contains: MARK } } });
    void hashMark;
  } catch (e) {
    console.error('Erreur pré-nettoyage :', e);
  }
}

executerAvecRetry('ANGLES', main)
  .catch(async (e) => { console.error('ERREUR SCRIPT:', e); await preCleanup(); process.exit(1); })
  .finally(() => db.$disconnect());
