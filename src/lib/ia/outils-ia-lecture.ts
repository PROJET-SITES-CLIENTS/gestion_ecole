// ====================================================================
// OUTILS IA — LECTURE COMPLÉMENTAIRE + DOCUMENTS OFFICIELS (7e module)
// Complète l'accès total : découverte des IDs nécessaires aux outils
// d'action (créneaux RDV, conseils, incidents/sanctions, dispenses,
// protection de l'enfance, internat, transport, biblio, tickets,
// conversations) + génération des 77 documents officiels du registre.
// ====================================================================

import { db } from '@/lib/db';
import { OutilIA } from './outils';

const P = (properties: Record<string, { type: string; description?: string; enum?: string[] }>, required?: string[]) => ({ type: 'object' as const, properties, required });

export const outilsIaLectureComplementaire: OutilIA[] = [
  // ═══ DOCUMENTS OFFICIELS (77 modèles) ═══
  {
    nom: 'lister_documents_officiels',
    description: "Liste TOUS les modèles de documents générables (77 : bulletins, certificats, contrats, reçus, PV, courriers…) avec leurs codes et paramètres requis — avant generer_document.",
    permission: 'eleves.lire',
    parametres: P({ domaine: { type: 'string', description: 'Filtre domaine (optionnel) : Scolarité, RH, Finances, Santé, Communication…' } }),
    executer: async (_ctx, args) => {
      const { CATALOGUE } = await import('@/lib/documents/registre');
      const liste = CATALOGUE
        .filter((m) => !args.domaine || m.domaine.toLowerCase().includes(String(args.domaine).toLowerCase()))
        .map((m) => ({
          code: m.code, libelle: m.libelle, domaine: m.domaine,
          parametres: m.parametres.map((p) => `${p.cle}${p.requis ? '*' : ''}:${p.libelle}`),
        }));
      return { total: liste.length, documents: liste };
    },
  },
  {
    nom: 'generer_document_officiel',
    description: "Génère N'IMPORTEL QUEL document officiel par son code (voir lister_documents_officiels) : retourne le LIEN imprimable prêt à ouvrir. Résout élève/personnel/classe par nom si fourni.",
    permission: 'eleves.lire',
    parametres: P({
      code: { type: 'string', description: 'Code du document (ex: certificat_travail, solde_tout_compte, recu_paiement…)' },
      eleve: { type: 'string', description: 'Élève ciblé, si applicable (nom)' },
      personnel: { type: 'string', description: 'Personnel ciblé, si applicable (nom)' },
      classe: { type: 'string', description: 'Classe ciblée, si applicable' },
      autresParams: { type: 'string', description: 'Autres paramètres « cle=valeur » séparés par & (ex: periodeId=abc&type=CDI)' },
    }, ['code']),
    executer: async (ctx, args) => {
      const { CATALOGUE, trouverModele } = await import('@/lib/documents/registre');
      void CATALOGUE;
      const modele = trouverModele(String(args.code));
      if (!modele) return { erreur: `Document « ${args.code} » inconnu — utilise lister_documents_officiels pour les codes valides.` };
      const params = new URLSearchParams();
      if (args.eleve) {
        const { resoudreEleve } = await import('./resolution');
        const re = await resoudreEleve(ctx.ecoleId!, String(args.eleve));
        if (!re.trouve) return { erreur: 'Élève : ' + re.erreur, candidats: re.candidats };
        params.set('eleveId', re.entite.id);
      }
      if (args.personnel) {
        const { resoudrePersonnel } = await import('./resolution');
        const rp = await resoudrePersonnel(ctx.ecoleId!, String(args.personnel));
        if (!rp.trouve) return { erreur: 'Personnel : ' + rp.erreur, candidats: rp.candidats };
        params.set('personnelId', rp.entite.id);
      }
      if (args.classe) {
        const { resoudreClasse } = await import('./resolution');
        const rc = await resoudreClasse(ctx.ecoleId!, String(args.classe));
        if (!rc.trouve) return { erreur: 'Classe : ' + rc.erreur, candidats: rc.candidats };
        params.set('classeId', rc.entite.id);
      }
      if (args.autresParams) {
        for (const paire of String(args.autresParams).split('&').filter(Boolean)) {
          const [cle, valeur] = paire.split('=').map((x) => x.trim());
          if (cle && valeur) params.set(cle, valeur);
        }
      }
      const manquants = modele.parametres.filter((p) => p.requis && !params.get(p.cle));
      if (manquants.length > 0) {
        return { erreur: `Paramètres manquants : ${manquants.map((p) => `${p.cle} (${p.libelle})`).join(', ')}.`, marcheASuivre: `Fournis-les via autresParams (cle=valeur&…). Paramètres du modèle : ${modele.parametres.map((p) => `${p.cle}${p.requis ? '*' : ''}`).join(', ')}` };
      }
      return {
        document: modele.libelle, code: modele.code,
        lien: `/api/documents/${modele.code}?${params.toString()}&auto=1`,
        message: `📄 ${modele.libelle} prêt — ouvrez le lien pour l'imprimer (il s'ouvre avec votre session et respecte vos permissions).`,
      };
    },
  },

  // ═══ CHAÎNES D'IDs — découverte pour les outils d'action ═══
  {
    nom: 'lister_creneaux_rdv',
    description: "Liste les créneaux de RDV parents-profs DISPONIBLES (avec enseignant et date) — IDs nécessaires à reserver_rdv_ia.",
    permission: ['communication.envoyer', 'eleves.lire'],
    parametres: P({}),
    executer: async (ctx) => {
      const creneaux = await db.creneauRdv.findMany({
        where: { personnel: { ecoleId: ctx.ecoleId!, deletedAt: null }, statut: 'disponible', date: { gte: new Date() } },
        orderBy: { date: 'asc' }, take: 60,
        include: { personnel: { select: { prenom: true, nom: true } } },
      });
      return { total: creneaux.length, creneaux: creneaux.map((c) => ({ creneauRdvId: c.id, enseignant: `${c.personnel?.prenom ?? ''} ${c.personnel?.nom ?? ''}`.trim(), date: c.date.toISOString().slice(0, 10), heures: `${c.heureDebut}-${c.heureFin}`, lieu: c.lieu })) };
    },
  },
  {
    nom: 'lister_conseils_classe',
    description: "Liste les conseils de classe avec leurs délibérations ouvertes — IDs pour deliberer_eleve, voter_deliberation, generer_pv_conseil_ia.",
    permission: ['bulletins.valider', 'admin.saas'],
    parametres: P({}),
    executer: async (ctx) => {
      const conseils = await db.conseilClasse.findMany({
        where: { ecoleId: ctx.ecoleId! }, orderBy: { date: 'desc' }, take: 20,
        include: { classe: { select: { libelle: true } }, deliberations: { include: { eleve: { select: { prenom: true, nom: true } }, votes: true } } },
      });
      return { conseils: conseils.map((c) => ({
        conseilId: c.id, classe: c.classe?.libelle ?? '—', date: c.date.toISOString().slice(0, 10), statut: c.statut,
        deliberations: c.deliberations.map((d) => ({ deliberationId: d.id, eleve: `${d.eleve?.prenom} ${d.eleve?.nom}`, decision: d.decision, votes: d.votes.length })),
      })) };
    },
  },
  {
    nom: 'lister_incidents_sanctions',
    description: "Liste les incidents récents et sanctions non exécutées — IDs pour exclure_temporairement et executer_sanction_ia.",
    permission: ['vie_scolaire.gerer', 'eleves.lire'],
    parametres: P({}),
    executer: async (ctx) => {
      const [incidents, sanctions] = await Promise.all([
        db.incident.findMany({ where: { eleve: { ecoleId: ctx.ecoleId! } }, orderBy: { dateHeure: 'desc' }, take: 20, include: { eleve: { select: { prenom: true, nom: true } } } }),
        db.sanction.findMany({ where: { incident: { eleve: { ecoleId: ctx.ecoleId! } }, statut: { not: 'executee' } }, take: 20, include: { incident: { include: { eleve: { select: { prenom: true, nom: true } } } } } }),
      ]);
      return {
        incidents: incidents.map((i) => ({ incidentId: i.id, eleve: `${i.eleve?.prenom} ${i.eleve?.nom}`, type: i.type, gravite: i.gravite, date: i.dateHeure.toISOString().slice(0, 10) })),
        sanctionsAExecuter: sanctions.map((s) => ({ sanctionId: s.id, eleve: `${s.incident?.eleve?.prenom} ${s.incident?.eleve?.nom}`, type: s.type })),
      };
    },
  },
  {
    nom: 'lister_dispenses',
    description: "Liste les demandes de dispense en attente — IDs pour traiter_dispense_ia.",
    permission: ['services.gerer', 'vie_scolaire.gerer', 'eleves.lire'],
    parametres: P({}),
    executer: async (ctx) => {
      const dispenses = await db.dispense.findMany({ where: { ecoleId: ctx.ecoleId!, statut: 'soumise' }, orderBy: { dateDebut: 'asc' }, take: 30 });
      return { total: dispenses.length, dispenses: dispenses.map((d) => ({ dispenseId: d.id, eleveId: d.eleveId, matiereId: d.matiereId, motif: d.motif, du: d.dateDebut.toISOString().slice(0, 10) })) };
    },
  },
  {
    nom: 'lister_signalements_enfance',
    description: "Liste les signalements de protection de l'enfance ouverts + plans d'accompagnement actifs — IDs pour toute la chaîne protection.",
    permission: 'protection.gerer',
    parametres: P({}),
    executer: async (ctx) => {
      const [signalements, plans] = await Promise.all([
        db.signalementMineur.findMany({ where: { ecoleId: ctx.ecoleId!, statut: { not: 'clos' } }, orderBy: { dateSignalement: 'desc' }, take: 20, include: { eleve: { select: { prenom: true, nom: true } }, mesures: true } }),
        db.planAccompagnement.findMany({ where: { eleve: { ecoleId: ctx.ecoleId! }, statut: { not: 'clos' } }, take: 20, include: { eleve: { select: { prenom: true, nom: true } }, objectifs: true } }),
      ]);
      return {
        signalements: signalements.map((s) => ({ signalementId: s.id, eleve: `${s.eleve?.prenom} ${s.eleve?.nom}`, gravite: s.gravite, statut: s.statut, mesures: s.mesures.length })),
        plans: plans.map((p) => ({ planId: p.id, eleve: `${p.eleve?.prenom} ${p.eleve?.nom}`, type: p.type, objectifs: p.objectifs.map((o) => ({ objectifId: o.id, atteint: o.atteint })) })),
      };
    },
  },
  {
    nom: 'lister_permissions_internat',
    description: "Liste les permissions d'internat en attente — IDs pour traiter_permission_internat.",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({}),
    executer: async (ctx) => {
      const permissions = await db.permissionInternat.findMany({ where: { ecoleId: ctx.ecoleId!, statut: 'demandee' }, orderBy: { dateDepart: 'asc' }, take: 30 });
      return { total: permissions.length, permissions: permissions.map((p) => ({ permissionId: p.id, eleveId: p.eleveId, depart: p.dateDepart.toISOString().slice(0, 10), retourPrevu: p.dateRetourPrevue.toISOString().slice(0, 10), motif: p.motif })) };
    },
  },
  {
    nom: 'lister_feuilles_route',
    description: "Liste les feuilles de route de transport ouvertes avec leurs passages/arrêts — IDs pour pointer_arret_ia et cloturer_feuille_route.",
    permission: ['services.gerer', 'admin.saas'],
    parametres: P({}),
    executer: async (ctx) => {
      const feuilles = await db.feuilleRoute.findMany({
        where: { ligne: { ecoleId: ctx.ecoleId! }, statut: { not: 'terminee' } }, orderBy: { date: 'desc' }, take: 15,
        include: { ligne: { select: { nom: true } }, passages: { orderBy: { arret: { ordre: 'asc' } }, include: { arret: { select: { nom: true } } } } },
      });
      return { feuilles: feuilles.map((f) => ({
        feuilleId: f.id, ligne: f.ligne?.nom ?? '—', date: f.date.toISOString().slice(0, 10),
        passages: f.passages.map((p) => ({ passageId: p.id, arret: p.arret?.nom ?? '—', heurePrevue: p.heurePrevue, pointe: Boolean(p.heureReelle) })),
      })) };
    },
  },
  {
    nom: 'lister_bibliotheque',
    description: "Catalogue bibliothèque (livres disponibles) + prêts en cours — IDs pour retourner_livre_ia.",
    permission: ['services.gerer', 'eleves.lire'],
    parametres: P({ recherche: { type: 'string', description: 'Filtre titre/auteur (optionnel)' } }),
    executer: async (ctx, args) => {
      const filtre = args.recherche
        ? { OR: [{ titre: { contains: String(args.recherche), mode: 'insensitive' as const } }, { auteur: { contains: String(args.recherche), mode: 'insensitive' as const } }] }
        : {};
      const [livres, prets] = await Promise.all([
        db.biblioLivre.findMany({ where: { ecoleId: ctx.ecoleId!, ...filtre }, take: 30, orderBy: { titre: 'asc' } }),
        db.biblioPret.findMany({ where: { livre: { ecoleId: ctx.ecoleId! }, dateRetourEffective: null }, take: 30, include: { livre: { select: { titre: true } }, eleve: { select: { prenom: true, nom: true } } } }),
      ]);
      return {
        livres: livres.map((l) => ({ livreId: l.id, titre: l.titre, auteur: l.auteur ?? '—', disponibles: l.exemplairesDisponibles, total: l.exemplairesTotal })),
        pretsEnCours: prets.map((p) => ({ pretId: p.id, livre: p.livre?.titre ?? '—', eleve: `${p.eleve?.prenom} ${p.eleve?.nom}`, retourPrevu: p.dateRetourPrevue.toISOString().slice(0, 10) })),
      };
    },
  },
  {
    nom: 'lister_tickets_ouverts',
    description: "Liste les tickets support ouverts — IDs/sujets pour repondre_ticket_ia et changer_statut_ticket.",
    permission: ['communication.envoyer', 'admin.saas'],
    parametres: P({}),
    executer: async (ctx) => {
      const tickets = await db.ticket.findMany({
        where: { ecoleId: ctx.ecoleId!, statut: { not: 'clos' } }, orderBy: { dateCreation: 'desc' }, take: 20,
      });
      return { total: tickets.length, tickets: tickets.map((t) => ({ ticketId: t.id, sujet: t.sujet, priorite: t.priorite, statut: t.statut, categorie: t.categorie })) };
    },
  },
  {
    nom: 'lister_conversations_ia',
    description: "Liste les conversations de l'école — pour envoyer_message_ia.",
    permission: 'communication.envoyer',
    parametres: P({}),
    executer: async (ctx) => {
      const conversations = await db.conversation.findMany({
        where: { ecoleId: ctx.ecoleId! }, orderBy: { dernierMessageAt: 'desc' }, take: 20,
        include: { _count: { select: { messages: true, participants: true } } },
      });
      return { total: conversations.length, conversations: conversations.map((c) => ({ conversationId: c.id, titre: c.titre, type: c.type, messages: c._count?.messages ?? 0, participants: c._count?.participants ?? 0 })) };
    },
  },
];
