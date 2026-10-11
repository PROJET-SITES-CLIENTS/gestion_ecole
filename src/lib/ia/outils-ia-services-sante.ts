// ====================================================================
// OUTILS IA — SERVICES (cantine, bibliothèque, manuels, transport,
// garderie, internat, activités) + SANTÉ (fiche, infirmerie, vaccinations,
// besoins spécifiques, aménagements)
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';
import { resoudreEleve } from './resolution';
import * as biz from '@/lib/business';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaServicesSante: OutilIA[] = [
  // ═══ CANTINE ═══
  {
    nom: 'inscrire_cantine_ia',
    description: "Inscrit un élève à la cantine (jours de la semaine, tarif journalier FCFA). Ex : jours 1,3,5 ; tarif 500.",
    permission: 'services.gerer',
    parametres: P({
      eleve: { type: 'string' },
      jours: { type: 'string', description: 'Jours (1=lundi … 5=vendredi) séparés par virgules, ex: 1,3,5' },
      tarifJournalier: { type: 'number', description: 'Tarif par jour en FCFA' },
    }, ['eleve', 'jours', 'tarifJournalier']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const jours = String(args.jours).split(',').map((j) => Number(j.trim())).filter((j) => j >= 1 && j <= 7);
      if (jours.length === 0) return { erreur: 'Jours invalides (attendu : 1,3,5).' };
      return biz.inscrireCantineCore(ctx as never, {
        eleveId: re.entite.id, joursSemaine: jours, tarifJournalier: Math.round(Number(args.tarifJournalier) * 100),
      } as never);
    },
  },
  {
    nom: 'annuler_cantine_ia',
    description: "Annule l'inscription cantine d'un élève.",
    permission: 'services.gerer',
    parametres: P({ eleve: { type: 'string' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const inscription = await db.cantineInscription.findFirst({ where: { eleveId: re.entite.id, actif: true } });
      if (!inscription) return { erreur: 'Cet élève n\'est pas inscrit à la cantine.' };
      return biz.annulerCantineCore(ctx as never, inscription.id);
    },
  },
  {
    nom: 'enregistrer_menu_ia',
    description: "Enregistre le menu du jour (plat principal, accompagnement, dessert, allergènes).",
    permission: 'services.gerer',
    parametres: P({
      date: { type: 'string', description: 'AAAA-MM-JJ' }, platPrincipal: { type: 'string' },
      accompagnement: { type: 'string' }, dessert: { type: 'string' },
      allergenes: { type: 'string', description: 'Allergènes séparés par virgules (optionnel)' },
    }, ['date', 'platPrincipal']),
    executer: async (ctx, args) =>
      biz.enregistrerMenuCore(ctx as never, ctx.ecoleId!, {
        date: new Date(String(args.date)), platPrincipal: String(args.platPrincipal),
        ...(args.accompagnement ? { accompagnement: String(args.accompagnement) } : {}),
        ...(args.dessert ? { dessert: String(args.dessert) } : {}),
        ...(args.allergenes ? { allergenes: String(args.allergenes).split(',').map((s) => s.trim()).filter(Boolean) } : {}),
      } as never),
  },
  {
    nom: 'pointer_repas_ia',
    description: "Fait l'appel des repas pour une date : liste « Nom Prénom: oui/non » séparée par points-virgules.",
    permission: 'services.gerer',
    parametres: P({
      date: { type: 'string', description: 'AAAA-MM-JJ' },
      presences: { type: 'string', description: 'Ex : « Awa Diop: oui; Malick Sow: non »' },
    }, ['date', 'presences']),
    executer: async (ctx, args) => {
      const presences: Array<{ eleveId: string; present: boolean }> = [];
      for (const paire of String(args.presences).split(';').map((s) => s.trim()).filter(Boolean)) {
        const [nom, reponse] = paire.split(':').map((s) => s.trim());
        const re = await resoudreEleve(ctx.ecoleId!, nom);
        if (!re.trouve) return { erreur: `Élève « ${nom} » : ${re.erreur}` };
        presences.push({ eleveId: re.entite.id, present: /oui|present|1|true/i.test(reponse ?? '') });
      }
      if (presences.length === 0) return { erreur: 'Aucune présence exploitable.' };
      return biz.pointerRepasCore(ctx as never, ctx.ecoleId!, new Date(String(args.date)), presences as never);
    },
  },

  // ═══ BIBLIOTHÈQUE & MANUELS ═══
  {
    nom: 'creer_livre_biblio',
    description: "Ajoute un livre au catalogue de la bibliothèque (titre, auteur, exemplaires).",
    permission: 'services.gerer',
    parametres: P({
      titre: { type: 'string' }, auteur: { type: 'string' }, exemplaires: { type: 'number', description: 'Nombre d\'exemplaires' },
      isbn: { type: 'string' }, editeur: { type: 'string' },
    }, ['titre', 'exemplaires']),
    executer: async (ctx, args) =>
      biz.creerLivreBiblioCore(ctx as never, ctx.ecoleId!, {
        titre: String(args.titre), exemplairesTotal: Number(args.exemplaires),
        ...(args.auteur ? { auteur: String(args.auteur) } : {}),
        ...(args.isbn ? { isbn: String(args.isbn) } : {}),
        ...(args.editeur ? { editeur: String(args.editeur) } : {}),
      } as never),
  },
  {
    nom: 'preter_livre_ia',
    description: "Prête un livre à un élève (durée en jours, max 60).",
    permission: 'services.gerer',
    parametres: P({
      livre: { type: 'string', description: 'Titre du livre' }, eleve: { type: 'string' },
      dureeJours: { type: 'number', description: 'Durée du prêt (1-60, défaut 14)' },
    }, ['livre', 'eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const livre = await db.biblioLivre.findFirst({ where: { titre: { contains: String(args.livre), mode: 'insensitive' } } });
      if (!livre) return { erreur: `Livre « ${args.livre} » introuvable.` };
      return biz.preterLivreCore(ctx as never, {
        livreId: livre.id, eleveId: re.entite.id, dureeJours: args.dureeJours !== undefined ? Number(args.dureeJours) : 14,
      } as never);
    },
  },
  {
    nom: 'retourner_livre_ia',
    description: "Enregistre le retour d'un livre par un élève.",
    permission: 'services.gerer',
    parametres: P({ eleve: { type: 'string' } }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const pret = await db.biblioPret.findFirst({ where: { eleveId: re.entite.id, dateRetourEffective: null } });
      if (!pret) return { erreur: 'Aucun prêt en cours pour cet élève.' };
      return biz.retournerLivreCore(ctx as never, pret.id);
    },
  },
  {
    nom: 'attribuer_manuel_ia',
    description: "Attribue un manuel scolaire à un élève (état remise : bon, usage, endommage).",
    permission: 'services.gerer',
    parametres: P({
      manuel: { type: 'string', description: 'Titre du manuel' }, eleve: { type: 'string' },
      etatRemise: { type: 'string', enum: ['bon', 'usage', 'endommage'] },
    }, ['manuel', 'eleve', 'etatRemise']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const manuel = await db.manuelScolaire.findFirst({ where: { titre: { contains: String(args.manuel), mode: 'insensitive' } } });
      if (!manuel) return { erreur: `Manuel « ${args.manuel} » introuvable.` };
      return biz.attribuerManuelCore(ctx as never, {
        manuelScolaireId: manuel.id, eleveId: re.entite.id, etatRemise: String(args.etatRemise),
      } as never);
    },
  },
  {
    nom: 'retourner_manuel_ia',
    description: "Enregistre le retour d'un manuel par un élève (état de retour).",
    permission: 'services.gerer',
    parametres: P({
      eleve: { type: 'string' }, etatRetour: { type: 'string', enum: ['bon', 'usage', 'endommage', 'perdu'] },
    }, ['eleve', 'etatRetour']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const attribution = await db.attributionManuel.findFirst({ where: { eleveId: re.entite.id, etatRetour: null } });
      if (!attribution) return { erreur: 'Aucun manuel en cours pour cet élève.' };
      return biz.retournerManuelCore(ctx as never, attribution.id, String(args.etatRetour));
    },
  },

  // ═══ TRANSPORT & GARDERIE ═══
  {
    nom: 'creer_ligne_transport_ia',
    description: "Crée une ligne de transport (nom, véhicule).",
    permission: 'services.gerer',
    parametres: P({ nom: { type: 'string' }, vehicule: { type: 'string' } }, ['nom']),
    executer: async (_ctx, args) => {
      const actions = await import('@/app/actions/extensions');
      const fd = new FormData();
      fd.set('nom', String(args.nom));
      if (args.vehicule) fd.set('vehicule', String(args.vehicule));
      return actions.creerLigneTransport(fd);
    },
  },
  {
    nom: 'inscrire_transport_ia',
    description: "Inscrit un élève au transport (ligne par nom, tarif mensuel FCFA).",
    permission: 'services.gerer',
    parametres: P({
      eleve: { type: 'string' }, ligne: { type: 'string', description: 'Nom de la ligne' },
      tarif: { type: 'number', description: 'Tarif mensuel FCFA' },
    }, ['eleve', 'ligne', 'tarif']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const ligne = await db.transportLigne.findFirst({ where: { nom: { contains: String(args.ligne), mode: 'insensitive' } } });
      if (!ligne) return { erreur: `Ligne « ${args.ligne} » introuvable.` };
      const actions = await import('@/app/actions/extensions');
      const fd = new FormData();
      fd.set('eleveId', re.entite.id); fd.set('ligneId', ligne.id); fd.set('tarif', String(args.tarif));
      return actions.inscrireTransport(fd);
    },
  },
  {
    nom: 'inscrire_garderie_ia',
    description: "Inscrit un élève à la garderie/périscolaire (tarif horaire FCFA, formule).",
    permission: 'services.gerer',
    parametres: P({
      eleve: { type: 'string' }, tarifHoraire: { type: 'number', description: 'FCFA/heure' },
      formule: { type: 'string', enum: ['horaire', 'forfait_mensuel'] },
    }, ['eleve', 'tarifHoraire']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.inscrireGarderieCore(ctx as never, {
        eleveId: re.entite.id, tarifHoraire: Math.round(Number(args.tarifHoraire) * 100),
        ...(args.formule ? { formule: String(args.formule) } : {}),
      } as never);
    },
  },
  {
    nom: 'pointer_garderie_ia',
    description: "Pointe l'arrivée ou le départ d'un élève en garderie (maintenant).",
    permission: 'services.gerer',
    parametres: P({
      eleve: { type: 'string' }, sens: { type: 'string', enum: ['arrivee', 'depart'] },
    }, ['eleve', 'sens']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.pointerGarderieCore(ctx as never, re.entite.id, args.sens as never, new Date());
    },
  },
  {
    nom: 'facturer_garderie_ia',
    description: "Facture la garderie du mois (minutes totales × tarif → échéances réelles).",
    permission: 'services.gerer',
    parametres: P({ mois: { type: 'string', description: 'AAAA-MM' } }, ['mois']),
    executer: async (ctx, args) =>
      biz.facturerGarderieCore(ctx as never, ctx.ecoleId!, new Date(`${String(args.mois)}-01T00:00:00Z`)),
  },

  // ═══ INTERNAT ═══
  {
    nom: 'inscrire_internat_ia',
    description: "Inscrit un élève à l'internat (régime interne/demi-pensionnaire, tarif mensuel, chambre optionnelle).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      eleve: { type: 'string' }, regime: { type: 'string', enum: ['interne', 'demi_pensionnaire'] },
      tarifMensuel: { type: 'number', description: 'FCFA/mois' }, chambre: { type: 'string', description: 'Chambre (optionnel)' },
    }, ['eleve', 'regime', 'tarifMensuel']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      let chambreId: string | undefined;
      if (args.chambre) {
        const chambre = await db.chambreInternat.findFirst({ where: { nom: { contains: String(args.chambre), mode: 'insensitive' } } });
        if (chambre) chambreId = chambre.id;
      }
      return biz.inscrireInternatCore(ctx as never, {
        eleveId: re.entite.id, regime: String(args.regime),
        tarifMensuel: Math.round(Number(args.tarifMensuel) * 100),
        ...(chambreId ? { chambreId } : {}),
      } as never);
    },
  },
  {
    nom: 'liberer_internat_ia',
    description: "Libère une place d'internat (sortie de l'élève).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({ eleve: { type: 'string' }, dateSortie: { type: 'string', description: 'AAAA-MM-JJ' } }, ['eleve', 'dateSortie']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const inscription = await db.inscriptionInternat.findFirst({ where: { eleveId: re.entite.id, dateSortie: null } });
      if (!inscription) return { erreur: 'Cet élève n\'est pas interné.' };
      return biz.libererPlaceInternatCore(ctx as never, inscription.id, new Date(String(args.dateSortie)));
    },
  },
  {
    nom: 'traiter_permission_internat',
    description: "Approuve ou refuse une permission de sortie d'internat (ou enregistre le retour effectif).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      permissionId: { type: 'string' }, decision: { type: 'string', enum: ['approuvee', 'refusee', 'retour'] },
      retourEffectif: { type: 'string', description: 'Date de retour AAAA-MM-JJ (si décision=retour)' },
    }, ['permissionId', 'decision']),
    executer: async (ctx, args) =>
      biz.traiterPermissionInternatCore(ctx as never, String(args.permissionId), args.decision as never,
        args.retourEffectif ? new Date(String(args.retourEffectif)) : undefined),
  },

  // ═══ ACTIVITÉS EXTRASCOLAIRES ═══
  {
    nom: 'creer_activite_ia',
    description: "Crée une activité, sortie ou voyage (titre, dates, coût, capacité).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      type: { type: 'string', enum: ['activite', 'sortie', 'voyage'] }, titre: { type: 'string' },
      dateDebut: { type: 'string', description: 'AAAA-MM-JJ' }, dateFin: { type: 'string', description: 'AAAA-MM-JJ' },
      destination: { type: 'string' }, cout: { type: 'number', description: 'Coût FCFA/participant' },
      capacite: { type: 'number' }, description: { type: 'string' },
    }, ['type', 'titre', 'dateDebut', 'dateFin']),
    executer: async (ctx, args) =>
      biz.creerActiviteCore(ctx as never, ctx.ecoleId!, {
        type: String(args.type), titre: String(args.titre),
        dateDebut: new Date(String(args.dateDebut)), dateFin: new Date(String(args.dateFin)),
        ...(args.destination ? { destination: String(args.destination) } : {}),
        ...(args.cout !== undefined ? { cout: Math.round(Number(args.cout) * 100) } : {}),
        ...(args.capacite !== undefined ? { capacite: Number(args.capacite) } : {}),
        ...(args.description ? { description: String(args.description) } : {}),
      } as never),
  },
  {
    nom: 'inscrire_participants_activite',
    description: "Inscrit des élèves à une activité (noms séparés par ;).",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({
      activite: { type: 'string', description: 'Titre de l\'activité' },
      eleves: { type: 'string', description: 'Noms séparés par ;' },
    }, ['activite', 'eleves']),
    executer: async (ctx, args) => {
      const activite = await db.activite.findFirst({ where: { titre: { contains: String(args.activite), mode: 'insensitive' } } });
      if (!activite) return { erreur: `Activité « ${args.activite} » introuvable.` };
      const eleveIds: string[] = [];
      for (const nom of String(args.eleves).split(';').map((s) => s.trim()).filter(Boolean)) {
        const re = await resoudreEleve(ctx.ecoleId!, nom);
        if (!re.trouve) return { erreur: `Élève « ${nom} » : ${re.erreur}` };
        eleveIds.push(re.entite.id);
      }
      return biz.inscrireParticipantCore(ctx as never, { activiteId: activite.id, eleveIds } as never);
    },
  },
  {
    nom: 'facturer_activite_ia',
    description: "Génère les échéances d'une activité pour ses participants inscrits.",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({ activite: { type: 'string', description: 'Titre de l\'activité' } }, ['activite']),
    executer: async (ctx, args) => {
      const activite = await db.activite.findFirst({ where: { titre: { contains: String(args.activite), mode: 'insensitive' } } });
      if (!activite) return { erreur: `Activité « ${args.activite} » introuvable.` };
      return biz.facturerActiviteCore(ctx as never, activite.id);
    },
  },
  {
    nom: 'generer_echeances_services_ia',
    description: "Génère les échéances mensuelles du service cantine ou transport pour le mois donné.",
    permission: ['services.gerer', 'finances.ecrire'],
    parametres: P({
      service: { type: 'string', enum: ['cantine', 'transport'] },
      mois: { type: 'string', description: 'AAAA-MM' },
    }, ['service', 'mois']),
    executer: async (ctx, args) =>
      biz.genererEcheancesServicesCore(ctx as never, ctx.ecoleId!, args.service as never, new Date(`${String(args.mois)}-01T00:00:00Z`)),
  },
  {
    nom: 'traiter_dispense_ia',
    description: "Valide ou refuse une demande de dispense (EPS…).",
    permission: ['services.gerer', 'vie_scolaire.gerer'],
    parametres: P({
      dispenseId: { type: 'string' }, decision: { type: 'string', enum: ['validee', 'refusee'] },
    }, ['dispenseId', 'decision']),
    executer: async (ctx, args) => biz.traiterDispenseCore(ctx as never, String(args.dispenseId), args.decision as never),
  },

  // ═══ SANTÉ ═══
  {
    nom: 'enregistrer_fiche_sante_ia',
    description: "Crée/met à jour la fiche santé d'un élève (groupe sanguin, allergies, traitements, médecin, urgence).",
    permission: 'sante.gerer',
    parametres: P({
      eleve: { type: 'string' }, groupeSanguin: { type: 'string' }, allergies: { type: 'string' },
      traitementsEnCours: { type: 'string' }, antecedents: { type: 'string' },
      medecinTraitant: { type: 'string' }, telephoneUrgence: { type: 'string' },
    }, ['eleve']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const d: Record<string, unknown> = { eleveId: re.entite.id };
      for (const k of ['groupeSanguin', 'allergies', 'traitementsEnCours', 'antecedents', 'medecinTraitant', 'telephoneUrgence']) {
        if (args[k] !== undefined) d[k] = String(args[k]);
      }
      return biz.enregistrerFicheSanteCore(ctx as never, d as never);
    },
  },
  {
    nom: 'passage_infirmerie_ia',
    description: "Enregistre un passage à l'infirmerie (motif, symptômes, soins, température, issue).",
    permission: 'sante.gerer',
    parametres: P({
      eleve: { type: 'string' }, motif: { type: 'string' }, symptomes: { type: 'string' },
      soinsAdministres: { type: 'string' }, temperature: { type: 'number' },
      issue: { type: 'string', enum: ['retour_classe', 'repos_infirmerie', 'retour_famille', 'evacuation'], description: 'Issue du passage' },
    }, ['eleve', 'motif', 'issue']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.enregistrerPassageInfirmerieCore(ctx as never, {
        eleveId: re.entite.id, motif: String(args.motif), issue: String(args.issue),
        ...(args.symptomes ? { symptomes: String(args.symptomes) } : {}),
        ...(args.soinsAdministres ? { soinsAdministres: String(args.soinsAdministres) } : {}),
        ...(args.temperature !== undefined ? { temperature: Number(args.temperature) } : {}),
      } as never);
    },
  },
  {
    nom: 'enregistrer_vaccination_ia',
    description: "Enregistre une vaccination (ou rappel) pour un élève.",
    permission: 'sante.gerer',
    parametres: P({
      eleve: { type: 'string' }, vaccin: { type: 'string' },
      dateVaccination: { type: 'string', description: 'AAAA-MM-JJ' }, dateRappel: { type: 'string', description: 'AAAA-MM-JJ (optionnel)' },
    }, ['eleve', 'vaccin']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.enregistrerVaccinationCore(ctx as never, {
        eleveId: re.entite.id, vaccin: String(args.vaccin),
        ...(args.dateVaccination ? { dateVaccination: new Date(String(args.dateVaccination)) } : {}),
        ...(args.dateRappel ? { dateRappel: new Date(String(args.dateRappel)) } : {}),
      } as never);
    },
  },
  {
    nom: 'verifier_rappels_vaccination_ia',
    description: "Liste les rappels de vaccination échus ou à venir.",
    permission: 'sante.gerer',
    parametres: P({}),
    executer: async () => biz.verifierRappelsVaccinationCore(),
  },
  {
    nom: 'ajouter_besoin_specifique_ia',
    description: "Documente un besoin spécifique d'un élève (dys, TDAH, handicap…) pour l'accompagnement.",
    permission: ['sante.gerer', 'vie_scolaire.gerer'],
    parametres: P({
      eleve: { type: 'string' }, type: { type: 'string', description: 'Type de besoin (ex: dyslexie)' },
      description: { type: 'string' },
    }, ['eleve', 'type', 'description']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      return biz.ajouterBesoinSpecifiqueCore(ctx as never, {
        eleveId: re.entite.id, type: String(args.type), description: String(args.description),
      } as never);
    },
  },
  {
    nom: 'ajouter_amenagement_ia',
    description: "Met en place un aménagement pédagogique pour un élève à besoins particuliers (type, description, durée).",
    permission: ['sante.gerer', 'vie_scolaire.gerer'],
    parametres: P({
      eleve: { type: 'string' }, typeAmenagement: { type: 'string', description: 'Ex : temps majoré, tierce temps' },
      description: { type: 'string' }, duree: { type: 'string', description: 'Durée (optionnel)' },
    }, ['eleve', 'typeAmenagement', 'description']),
    executer: async (ctx, args) => {
      const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
      if (!re.trouve) return { erreur: re.erreur, candidats: re.candidats };
      const actions = await import('@/app/actions/index');
      const fd = new FormData();
      fd.set('eleveId', re.entite.id);
      fd.set('typeAmenagement', String(args.typeAmenagement));
      fd.set('description', String(args.description));
      if (args.duree) fd.set('duree', String(args.duree));
      return actions.ajouterAmenagement(fd);
    },
  },
];
