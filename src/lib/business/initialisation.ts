// ====================================================================
// INITIALISATION D'ÉCOLE — le PREMIER compte = administrateur
// Le premier qui arrive crée son école + son compte admin (actif
// immédiatement). Tous les suivants passent par la file d'attente.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, logAction } from './commun';
import { hashPassword } from '@/lib/auth-hash';

export type InitialisationInput = {
  nomEcole: string;
  adminNom: string;
  adminPrenom: string;
  adminEmail: string;
  adminMotDePasse: string;
};

export async function initialiserEcoleCore(input: InitialisationInput) {
  // Validations
  if (!input.nomEcole?.trim()) throw new ActionError('Le nom de l\'école est obligatoire.', 'CHAMP_MANQUANT');
  if (!input.adminNom?.trim() || !input.adminPrenom?.trim()) throw new ActionError('Votre nom et prénom sont obligatoires.', 'CHAMP_MANQUANT');
  const email = input.adminEmail?.trim().toLowerCase() ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError('Email invalide.', 'CHAMP_INVALIDE');
  if (input.adminMotDePasse?.length < 8) throw new ActionError('Le mot de passe doit comporter au moins 8 caractères.', 'MDP_FAIBLE');

  // Email déjà pris ?
  const existant = await db.utilisateur.findFirst({ where: { email, deletedAt: null } });
  if (existant) throw new ActionError('Un compte avec cet email existe déjà.', 'EMAIL_PRIS');

  // Garde-fou anti-abus (action publique) : max 5 écoles créées / heure
  const derniereHeure = new Date(Date.now() - 3600000);
  const nbRecentes = await db.ecole.count({ where: { dateCreation: { gte: derniereHeure } } });
  if (nbRecentes >= 5) throw new ActionError('Trop de créations d\'établissement récentes. Réessayez dans un instant.', 'LIMITE_ATTEINTE');

  // Slug unique
  const slug = input.nomEcole.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ecole';
  const slugExistant = await db.ecole.findFirst({ where: { slug } });
  const slugFinal = slugExistant ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;

  // Année scolaire en cours
  const debut = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const libelleAnnee = `${debut}-${debut + 1}`;

  // ═══ Créer TOUT en une seule transaction ═══
  const resultat = await db.$transaction(async (tx) => {
    // 1) École
    const ecole = await tx.ecole.create({
      data: {
        nom: input.nomEcole.trim(),
        slug: slugFinal,
        pays: 'SN', devise: 'XOF', fuseauHoraire: 'Africa/Dakar',
        statut: 'actif',
      },
    });

    // 2) Année + 3 trimestres
    const annee = await tx.anneeScolaire.create({
      data: {
        ecoleId: ecole.id, libelle: libelleAnnee,
        dateDebut: new Date(Date.UTC(debut, 8, 1)),
        dateFin: new Date(Date.UTC(debut + 1, 6, 31)),
        active: true,
      },
    });
    await tx.periode.createMany({ data: [
      { ecoleId: ecole.id, anneeScolaireId: annee.id, code: 'T1', libelle: 'Trimestre 1', dateDebut: new Date(Date.UTC(debut, 8, 1)), dateFin: new Date(Date.UTC(debut, 11, 15)), typeBulletin: 'college_lycee' },
      { ecoleId: ecole.id, anneeScolaireId: annee.id, code: 'T2', libelle: 'Trimestre 2', dateDebut: new Date(Date.UTC(debut + 1, 0, 5)), dateFin: new Date(Date.UTC(debut + 1, 2, 30)), typeBulletin: 'college_lycee' },
      { ecoleId: ecole.id, anneeScolaireId: annee.id, code: 'T3', libelle: 'Trimestre 3', dateDebut: new Date(Date.UTC(debut + 1, 3, 1)), dateFin: new Date(Date.UTC(debut + 1, 5, 30)), typeBulletin: 'college_lycee' },
    ] });

    // 3) Structure académique (15 niveaux + 15 classes)
    const STRUCTURE: Array<{ c: string; lc: string; mode: string; s: string; ls: string; n: Array<[string, string]> }> = [
      { c: 'MAT', lc: 'Maternelle', mode: 'competences', s: 'MAT', ls: 'Maternelle', n: [['PS', 'Petite section'], ['MS', 'Moyenne section'], ['GS', 'Grande section']] },
      { c: 'PRIM', lc: 'Primaire', mode: 'chiffre', s: 'PRIM', ls: 'Primaire', n: [['CP', 'CP'], ['CE1', 'CE1'], ['CE2', 'CE2'], ['CM1', 'CM1'], ['CM2', 'CM2']] },
      { c: 'COLL', lc: 'Collège', mode: 'chiffre', s: 'COLL', ls: 'Collège', n: [['6E', 'Sixième'], ['5E', 'Cinquième'], ['4E', 'Quatrième'], ['3E', 'Troisième']] },
      { c: 'LYC', lc: 'Lycée', mode: 'chiffre', s: 'LYC', ls: 'Lycée', n: [['2NDE', 'Seconde'], ['1ERE', 'Première'], ['TLE', 'Terminale']] },
    ];
    let ordre = 1;
    for (const bloc of STRUCTURE) {
      const cy = await tx.cycle.create({ data: { ecoleId: ecole.id, code: bloc.c, libelle: bloc.lc, ordre: ordre++, modeEvaluation: bloc.mode } });
      const se = await tx.section.create({ data: { cycleId: cy.id, code: bloc.s, libelle: bloc.ls } });
      for (const [code, libelle] of bloc.n) {
        const nv = await tx.niveau.create({ data: { sectionId: se.id, code, libelle, ordre: ordre++ } });
        await tx.classe.create({ data: { ecoleId: ecole.id, niveauId: nv.id, anneeScolaireId: annee.id, code: code + '-A', libelle: libelle + ' A', capaciteMax: 40 } });
      }
    }

    // 4) Rôles + permissions + matrice
    const ROLES: Array<{ code: string; libelle: string }> = [
      { code: 'direction', libelle: 'Direction' },
      { code: 'enseignant', libelle: 'Enseignant' },
      { code: 'comptabilite', libelle: 'Comptabilité' },
      { code: 'surveillant', libelle: 'Surveillant' },
      { code: 'rh', libelle: 'Ressources Humaines' },
      { code: 'censeur', libelle: 'Censeur' },
      { code: 'secretariat', libelle: 'Secrétariat' },
      { code: 'assistant_direction', libelle: 'Assistant de Direction' },
      { code: 'infirmier', libelle: 'Infirmier(ère)' },
    ];
    const MATRICE: Record<string, string[]> = {
      direction: ['eleves.lire','eleves.ecrire','bulletins.valider','finances.voir','finances.ecrire','finances.valider','rh.gerer','communication.envoyer','admin.saas','vie_scolaire.gerer','securite.gerer','examens.gerer','services.gerer','edt.gerer','sante.gerer','salles.gerer','protection.gerer'],
      enseignant: ['eleves.lire','notes.saisir','presences.saisir','vie_scolaire.gerer','edt.gerer'],
      comptabilite: ['finances.voir','finances.ecrire','finances.valider'],
      surveillant: ['eleves.lire','presences.saisir','vie_scolaire.gerer','securite.gerer'],
      rh: ['eleves.lire','rh.gerer','communication.envoyer'],
      censeur: ['eleves.lire','bulletins.valider','presences.saisir','vie_scolaire.gerer','examens.gerer','edt.gerer','protection.gerer'],
      secretariat: ['eleves.lire','eleves.ecrire','communication.envoyer'],
      assistant_direction: ['eleves.lire','eleves.ecrire','presences.saisir','vie_scolaire.gerer','communication.envoyer'],
      infirmier: ['eleves.lire','sante.gerer'],
    };
    const roleIds = new Map<string, string>();
    for (const r of ROLES) {
      const cree = await tx.role.create({ data: { ecoleId: ecole.id, code: r.code, libelle: r.libelle } });
      roleIds.set(r.code, cree.id);
    }
    const PERMS = ['eleves.lire','eleves.ecrire','notes.saisir','bulletins.valider','finances.voir','finances.ecrire','finances.valider','presences.saisir','rh.gerer','communication.envoyer','admin.saas','vie_scolaire.gerer','securite.gerer','examens.gerer','services.gerer','edt.gerer','sante.gerer','salles.gerer','protection.gerer'];
    const permIds = new Map<string, string>();
    for (const code of PERMS) {
      const p = await tx.permission.findUnique({ where: { code } }) ?? await tx.permission.create({ data: { code, libelle: code, module: code.split('.')[0] } });
      permIds.set(code, p.id);
    }
    for (const [codeRole, codes] of Object.entries(MATRICE)) {
      const roleId = roleIds.get(codeRole)!;
      await tx.rolePermission.createMany({ data: codes.map((c) => ({ roleId, permissionId: permIds.get(c)! })) });
    }

    // 5) Compte ADMIN (actif immédiatement — le PREMIER)
    const admin = await tx.utilisateur.create({
      data: {
        ecoleId: ecole.id,
        email,
        motDePasseHash: hashPassword(input.adminMotDePasse),
        nom: input.adminNom.trim(),
        prenom: input.adminPrenom.trim(),
        type: 'personnel',
        actif: true, // ⬅️ ACTIF immédiatement
        consentementPortail: true,
        consentementDate: new Date(),
      },
    });
    await tx.utilisateurRole.create({
      data: { utilisateurId: admin.id, roleId: roleIds.get('direction')! },
    });
    await tx.personnel.create({
      data: {
        ecoleId: ecole.id, utilisateurId: admin.id,
        matricule: 'PER-0001',
        nom: input.adminNom.trim(), prenom: input.adminPrenom.trim(),
        email, dateEmbauche: new Date(), typeContrat: 'CDI', statut: 'actif',
      },
    });

    // 6) Paie par défaut + thème
    await tx.configurationPaie.create({ data: { ecoleId: ecole.id } });

    await logAction(tx, ecole.id, admin.id, 'ecole.initialisation', 'ecole', ecole.id, {
      nom: input.nomEcole, slug: slugFinal, admin: email,
    });

    return { ecoleId: ecole.id, slug: slugFinal, adminId: admin.id, email };
  }, { timeout: 120000, maxWait: 30000 });

  return resultat;
}
