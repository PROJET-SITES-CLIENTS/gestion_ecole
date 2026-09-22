// ====================================================================
// REGISTRE — domaines 2 à 8 : vie scolaire, finances, RH, santé,
// communication, admissions, services.
// ====================================================================

import { db } from '@/lib/db';
import { ActionError } from '@/lib/business/commun';
import { formatXOF } from '@/lib/format';
import { echapper, dateFr, dateCourte, montantEnLettres, blocEleve, zoneSignature, doubleSignature } from './charte';
import { trameAttestation, trameConvocation, trameAutorisation, trameNotification, tramePieceFinanciere } from './corps';
import { ParamDoc, CtxDoc, ModeleDoc } from './registre-types';

const P = {
  eleve: (requis = true): ParamDoc => ({ cle: 'eleveId', libelle: 'Élève', type: 'eleve', requis }),
  classe: (requis = true): ParamDoc => ({ cle: 'classeId', libelle: 'Classe', type: 'classe', requis }),
  periode: (requis = true): ParamDoc => ({ cle: 'periodeId', libelle: 'Période', type: 'periode', requis }),
  personnel: (requis = true): ParamDoc => ({ cle: 'personnelId', libelle: 'Personnel', type: 'personnel', requis }),
  texte: (cle: string, libelle: string, aide?: string, requis = true): ParamDoc => ({ cle, libelle, type: 'texte', requis, aide }),
  textarea: (cle: string, libelle: string, requis = false): ParamDoc => ({ cle, libelle, type: 'textarea', requis }),
  date: (cle: string, libelle: string, requis = true): ParamDoc => ({ cle, libelle, type: 'date', requis }),
};

function mention(texte: string) { return `<div class="mention-legale">${echapper(texte)}</div>`; }

function tableauKV(lignes: Array<[string, string]>, titre?: string): string {
  return `${titre ? `<div class="section-titre">${echapper(titre)}</div>` : ''}
  <table class="data">${lignes.map(([k, v]) => `<tr><td style="width:36%;font-weight:600;background:#f4f8f7">${echapper(k)}</td><td>${v}</td></tr>`).join('')}</table>`;
}

async function eleveComplet(ecoleId: string, eleveId: string) {
  const el = await db.eleve.findFirst({
    where: { id: eleveId, ecoleId, deletedAt: null },
    include: { classeActuelle: { include: { niveau: true } }, parents: { include: { parent: true } } },
  });
  if (!el) throw new ActionError('Élève introuvable dans votre école.', 'INTROUVABLE');
  return el as any;
}

// ====================================================================
// DOMAINE 2 — VIE SCOLAIRE & DISCIPLINE
// ====================================================================

const docsVieScolaire: ModeleDoc[] = [
  {
    code: 'note_service', libelle: 'Note de service', domaine: 'Vie scolaire & discipline',
    description: 'Instruction officielle de la direction au personnel/aux familles.',
    entete: 'mineur', permission: 'communication.envoyer',
    parametres: [P.texte('numero', 'Numéro', 'Ex : 2026-047'), P.texte('objet', 'Objet'), P.texte('destinataires', 'Destinataires', 'Ex : le personnel enseignant'), P.textarea('corps', 'Corps de la note (un article par ligne : "1. …")', true), P.date('application', 'Date d\'application')],
    generer: async (c) => {
      const articles = c.p.corps.split('\n').map((l) => l.trim()).filter(Boolean);
      return {
        titre: '',
        corps: `
        <div style="text-align:center;font-size:12.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:6px 0 2px">Note de service n° ${echapper(c.p.numero || '—')}</div>
        <div style="text-align:center;font-size:10.6pt;font-style:italic;margin-bottom:6px">Objet : ${echapper(c.p.objet)}</div>
        <div class="cadre" style="text-align:center;font-weight:600">À l'attention de ${echapper(c.p.destinataires)}</div>
        <p style="font-size:10.8pt;text-align:justify;margin:14px 0">La Direction de l'établissement <b>${echapper(c.identite.nom)}</b> porte à la connaissance de ${echapper(c.p.destinataires)} ce qui suit :</p>
        <div style="font-size:10.8pt;text-align:justify;line-height:1.85">
        ${articles.map((a, i) => `<p style="margin:7px 0"><b>Article ${i + 1}.</b> ${echapper(a.replace(/^\d+[.\-)]\s*/, ''))}</p>`).join('')}
        </div>
        <div class="cadre" style="margin-top:16px"><b>Date d'application :</b> ${dateFr(c.p.application)}</div>
        <p style="font-size:10pt;margin-top:10px;font-style:italic">Cette note sera affichée au bureau de la vie scolaire et diffusée par les canaux officiels de l'établissement.</p>
        ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'note_information', libelle: 'Note d\'information', domaine: 'Vie scolaire & discipline',
    description: 'Information sans caractère contraignant.',
    entete: 'mineur', permission: 'communication.envoyer',
    parametres: [P.texte('numero', 'Numéro', '', false), P.texte('objet', 'Objet'), P.texte('destinataires', 'Destinataires'), P.textarea('corps', 'Contenu de l\'information', true)],
    generer: async (c) => ({
      titre: '',
      corps: `
      <div style="text-align:center;font-size:12.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:6px 0 2px">Note d'information${c.p.numero ? ' n° ' + echapper(c.p.numero) : ''}</div>
      <div style="text-align:center;font-size:10.6pt;font-style:italic;margin-bottom:6px">Objet : ${echapper(c.p.objet)}</div>
      <div class="cadre" style="text-align:center;font-weight:600">À l'attention de ${echapper(c.p.destinataires)}</div>
      <div style="font-size:10.8pt;text-align:justify;margin-top:14px;line-height:1.85">${echapper(c.p.corps).replace(/\n/g, '<br/>')}</div>
      ${zoneSignature(c.identite)}`,
    }),
  },
  {
    code: 'circulaire_parents', libelle: 'Circulaire aux parents', domaine: 'Vie scolaire & discipline',
    description: 'Lettre officielle aux familles avec coupon-réponse détachable.',
    entete: 'mineur', permission: 'communication.envoyer',
    parametres: [P.texte('objet', 'Objet'), P.textarea('corps', 'Corps de la circulaire', true), P.texte('echeance', 'Date limite de réponse (coupon)', '', false)],
    generer: async (c) => ({
      titre: '',
      corps: `
      <div style="text-align:center;font-size:12.5pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:4px 0 8px">Aux parents d'élèves</div>
      <p style="font-size:10.8pt;text-align:justify"><b>Objet : ${echapper(c.p.objet)}</b></p>
      <p style="font-size:10.8pt;text-align:justify;line-height:1.8">Chers parents,<br/><br/>${echapper(c.p.corps).replace(/\n/g, '<br/>')}</p>
      <p style="font-size:10.8pt">Nous vous remercions de votre confiance et vous prions d'agréer, chers parents, l'expression de notre considération distinguée.</p>
      ${zoneSignature(c.identite)}
      <div style="page-break-inside:avoid;margin-top:26px;border:1.6px dashed #888;border-radius:8px;padding:12px 16px">
        <div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555">Coupon-réponse — à retourner signé ${c.p.echeance ? `avant le ${dateFr(c.p.echeance)}` : 'au bureau de la vie scolaire'}</div>
        <table style="width:100%;margin-top:8px;font-size:9.6pt"><tr>
          <td>Nom de l'élève : <span class="points"></span></td><td>Classe : <span class="points" style="min-width:80px"></span></td>
        </tr></table>
        <div style="margin-top:10px;font-size:9.6pt">☐ J'ai pris connaissance de la circulaire &nbsp;&nbsp; ☐ Je participerai &nbsp;&nbsp; ☐ Je ne participerai pas</div>
        <div style="margin-top:10px;font-size:9.6pt">Signature du parent : <span class="points" style="min-width:230px"></span></div>
      </div>`,
    }),
  },
  {
    code: 'convocation_eleve', libelle: 'Convocation élève / parent', domaine: 'Vie scolaire & discipline',
    description: 'Convocation individuelle (discipline, résultats, entretien).',
    entete: 'mineur', permission: 'vie_scolaire.gerer',
    parametres: [P.eleve(), P.texte('motif', 'Motif de la convocation'), P.date('date', 'Date'), P.texte('heure', 'Heure', 'Ex : 10h30'), P.texte('salle', 'Salle / bureau'), P.texte('presenceParent', 'Présence du parent', 'Ex : obligatoire', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: '',
        corps: trameConvocation({
  identite: c.identite,
          destinataireHtml: `<b>${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</b> — classe de ${echapper(el.classeActuelle?.libelle || '—')}<br/><span style="font-size:9.6pt;color:#555">et son représentant légal</span>`,
          motif: c.p.motif,
          dateHeure: `${dateFr(c.p.date)} à ${echapper(c.p.heure)}`,
          lieu: c.p.salle,
          ordreDuJour: [],
          obligatoire: (c.p.presenceParent || '').toLowerCase().includes('oblig'),
          signataire: 'La Vie scolaire',
        }) + `<p style="font-size:10pt">Présence du responsable légal : <b>${echapper(c.p.presenceParent || 'souhaitée')}</b></p>` + zoneSignature(c.identite, { qui: 'Le Censeur / La Vie scolaire' }),
      };
    },
  },
  {
    code: 'rapport_incident', libelle: 'Rapport d\'incident', domaine: 'Vie scolaire & discipline',
    description: 'Constat factuel daté et signé (base de toute procédure).',
    entete: 'mineur', permission: 'vie_scolaire.gerer',
    parametres: [{ cle: 'incidentId', libelle: 'Incident', type: 'incident', requis: true }, P.texte('suite', 'Suite donnée / mesure immédiate', '', false)],
    generer: async (c) => {
      const inc = await (db as any).incident.findFirst({
        where: { id: c.p.incidentId, eleve: { ecoleId: c.identite.ecoleId } },
        include: { eleve: { include: { classeActuelle: true } }, declarePar: true },
      });
      if (!inc) throw new ActionError('Incident introuvable dans votre école.', 'INTROUVABLE');
      return {
        titre: 'Rapport d\'incident',
        corps: `
        ${tableauKV([
          ['Élève concerné', `${echapper(inc.eleve.prenom)} ${echapper(String(inc.eleve.nom).toUpperCase())} — ${echapper(inc.eleve.classeActuelle?.libelle || '—')}`],
          ['Date et heure des faits', `${dateFr(inc.dateHeure)} — ${new Date(inc.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`],
          ['Lieu', echapper(inc.lieu || '—')],
          ['Type d\'incident', echapper(inc.type)],
          ['Gravité', `<b style="color:${inc.gravite === 'grave' ? '#b91c1c' : inc.gravite === 'moyen' ? '#b45309' : '#047857'}">${echapper(String(inc.gravite).toUpperCase())}</b>`],
          ['Déclarant', echapper(inc.declarePar ? `${inc.declarePar.prenom} ${inc.declarePar.nom}` : '—')],
          ['Témoins', echapper(inc.temoins || 'aucun')],
        ])}
        <div class="section-titre">Description factuelle des faits</div>
        <div class="cadre" style="text-align:justify;min-height:90px">${echapper(inc.description)}</div>
        ${c.p.suite ? tableauKV([['Mesure immédiate / suite donnée', echapper(c.p.suite)]]) : ''}
        ${mention('Ce rapport est purement factuel : il ne comporte aucun jugement sur l\'élève. Il sert de base à la procédure éducative.')}
        ${doubleSignature(c.identite, { qui: 'Le déclarant' }, { qui: 'Le Censeur (visa)' })}`,
      };
    },
  },
  {
    code: 'avertissement', libelle: 'Avertissement / blâme', domaine: 'Vie scolaire & discipline',
    description: 'Sanction disciplinaire notifiée à l\'élève et à sa famille.',
    entete: 'mineur', permission: 'vie_scolaire.gerer',
    parametres: [P.eleve(), P.texte('motif', 'Motif de la sanction'), { cle: 'sanction', libelle: 'Sanction', type: 'select', requis: true, options: [{ valeur: 'Avertissement oral', libelle: 'Avertissement oral' }, { valeur: 'Avertissement écrit', libelle: 'Avertissement écrit' }, { valeur: 'Blâme', libelle: 'Blâme' }] }, P.texte('article', 'Article du règlement intérieur violé', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: '',
        corps: `
        <div style="text-align:center;font-size:12.5pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:4px 0 10px">${echapper(c.p.sanction)}</div>
        ${trameNotification({
          titre: '', objet: `${echapper(c.p.sanction)} notifié à ${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}`,
          corpsHtml: `Nous sommes au regret de vous informer que les faits suivants ont été constatés à l'encontre de votre enfant, élève en classe de <b>${echapper(el.classeActuelle?.libelle || '—')}</b> :
          <div class="cadre" style="margin:10px 0"><b>Motif :</b> ${echapper(c.p.motif)}</div>
          ${c.p.article ? `Ces faits contreviennent à l'<b>article ${echapper(c.p.article)}</b> du règlement intérieur de l'établissement, que vous avez signé à l'inscription.` : ''}
          <br/><br/>En conséquence, il lui est notifié un(e) <b>${echapper(c.p.sanction)}</b>. Nous vous invitons à accompagner votre enfant afin que ce type de situation ne se reproduise pas. L'établissement reste à votre disposition pour un entretien.`,
        }).replace('<h2 class="titre-doc"></h2>', '')}
        ${doubleSignature(c.identite, { qui: 'L\'élève (pris connaissance)' }, { qui: 'Le Chef d\'Établissement' })}
        <table style="width:100%;margin-top:20px;font-size:9.8pt"><tr><td>Le parent / tuteur (pris connaissance) : <span class="points" style="min-width:250px"></span></td></tr></table>`,
      };
    },
  },
  {
    code: 'exclusion_temporaire', libelle: 'Exclusion temporaire', domaine: 'Vie scolaire & discipline',
    description: 'Décision d\'exclusion temporaire avec conditions de retour.',
    entete: 'mineur', permission: 'vie_scolaire.gerer',
    parametres: [P.eleve(), P.texte('motif', 'Motif'), P.date('debut', 'Début d\'exclusion'), P.date('fin', 'Fin d\'exclusion (retour)' ), P.textarea('conditions', 'Conditions de retour', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Décision d\'exclusion temporaire',
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } })}
        <p style="font-size:10.8pt;text-align:justify">À la suite des faits suivants : <b>${echapper(c.p.motif)}</b>, et après consultation des personnels concernés, la Direction a décidé d'une <b>exclusion temporaire</b> de l'établissement :</p>
        ${tableauKV([['Période d\'exclusion', `du <b>${dateFr(c.p.debut)}</b> au <b>${dateFr(c.p.fin)}</b> inclus`], ['Retour en classe', `${dateFr(c.p.fin)} à 8h00`], ['Travail à fournir', 'L\'élève conserve ses devoirs sur le portail et devra les présenter au retour.']])}
        ${c.p.conditions ? tableauKV([['Conditions de retour', echapper(c.p.conditions)]]) : ''}
        <div class="cadre-rouge">L\'élève ne peut être présent dans l'enceinte de l'établissement pendant la période d'exclusion, sauf convocation écrite.</div>
        ${doubleSignature(c.identite, { qui: 'Le Parent / Tuteur (informé)' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
  {
    code: 'justificatif_absence', libelle: 'Justificatif d\'absence', domaine: 'Vie scolaire & discipline',
    description: 'Formulaire à compléter et signer par la famille.',
    entete: 'mineur',
    parametres: [P.eleve(), P.date('debut', 'Absent(e) depuis'), P.date('fin', 'Jusqu\'à', false), { cle: 'motif', libelle: 'Motif', type: 'select', requis: true, options: [{ valeur: 'Maladie', libelle: 'Maladie' }, { valeur: 'Raison familiale', libelle: 'Raison familiale' }, { valeur: 'Rendez-vous médical', libelle: 'Rendez-vous médical' }, { valeur: 'Autre', libelle: 'Autre (préciser)' }] }, P.texte('detail', 'Détail / justificatif joint', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Justificatif d\'absence',
        corps: `
        <p style="font-size:10.8pt">Je soussigné(e) <span class="points" style="min-width:210px"></span>, responsable légal de :</p>
        ${blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle }, matricule: el.matricule })}
        ${tableauKV([
          ['Période d\'absence', `du <b>${dateFr(c.p.debut)}</b>${c.p.fin ? ` au <b>${dateFr(c.p.fin)}</b>` : ''}`],
          ['Motif déclaré', echapper(c.p.motif)],
          ['Détail', echapper(c.p.detail || '—')],
          ['Justificatif joint', '☐ Oui &nbsp;&nbsp; ☐ Non <span style="color:#888;font-size:8.8pt">(certificat médical exigé au-delà de 3 jours)</span>'],
        ])}
        <div style="margin-top:26px;font-size:10.6pt">Fait le <span class="points" style="min-width:110px"></span> — Signature du responsable légal : <span class="points" style="min-width:220px"></span></div>
        <div class="cadre" style="margin-top:20px"><b>Visa vie scolaire :</b> ☐ Accepté &nbsp; ☐ Refusé (absence non justifiée) — <span class="points" style="min-width:130px"></span></div>`,
      };
    },
  },
  {
    code: 'autorisation_sortie', libelle: 'Autorisation de sortie exceptionnelle', domaine: 'Vie scolaire & discipline',
    description: 'Sortie ponctuelle pendant le temps scolaire — double validation.',
    entete: 'majeur', permission: 'vie_scolaire.gerer',
    parametres: [P.eleve(), P.date('date', 'Date de sortie'), P.texte('heure', 'Heure de sortie'), P.texte('destination', 'Destination / motif'), P.texte('accompagnateur', 'Accompagnateur autorisé (nom)', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Autorisation de sortie exceptionnelle',
        corps: trameAutorisation({
  identite: c.identite,
          titre: 'Autorisation de sortie exceptionnelle',
          objetHtml: `Le responsable légal de <b>${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</b>, élève en classe de <b>${echapper(el.classeActuelle?.libelle || '—')}</b>, autorise l'établissement à laisser sortir son enfant selon les modalités ci-dessous :`,
          detailsHtml: tableauKV([
            ['Date et heure de sortie', `${dateFr(c.p.date)} à <b>${echapper(c.p.heure)}</b>`],
            ['Destination / motif', echapper(c.p.destination)],
            ['Accompagnateur autorisé', echapper(c.p.accompagnateur || 'le responsable légal lui-même')],
            ['Pièce d\'identité requise', 'L\'accompagnateur devra présenter une pièce d\'identité avec photographie.'],
          ]),
          cases: ['J\'autorise mon enfant à quitter l\'établissement aux date et heure indiquées', 'J\'ai informé mon enfant qu\'il/elle doit se présenter à la vie scolaire avant de sortir'],
          dureeValidite: `La présente autorisation est strictement limitée au ${dateFr(c.p.date)}.`,
        }),
      };
    },
  },
  {
    code: 'autorisation_image', libelle: 'Autorisation droit à l\'image', domaine: 'Vie scolaire & discipline',
    description: 'Autorisation d\'utilisation de l\'image de l\'élève.',
    entete: 'majeur',
    parametres: [P.eleve(), P.date('debut', 'Valable depuis'), P.date('fin', 'Jusqu\'au', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const corps = trameAutorisation({
  identite: c.identite,
        titre: 'Autorisation de droit à l\'image',
        objetHtml: `Dans le cadre des activités pédagogiques et de la communication de l'établissement <b>${echapper(c.identite.nom)}</b>, nous sommes amenés à photographier ou filmer les élèves. La réglementation exige l'autorisation écrite des responsables légaux.`,
        detailsHtml: blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle } }),
        cases: [
          'Site internet officiel de l\'établissement',
          'Réseaux sociaux officiels de l\'établissement (nom de l\'élève non mentionné)',
          'Presse locale et supports imprimés (prospectus, panneaux)',
          'Reportages pédagogiques internes',
        ],
        dureeValidite: `du ${dateFr(c.p.debut)} au ${c.p.fin ? dateFr(c.p.fin) : '30 juin ' + (new Date().getFullYear() + 1)} (année scolaire en cours)`,
      });
      return { titre: 'Autorisation de droit à l\'image', corps: corps + `<div class="mention-legale">Autorisation révocable à tout moment par simple courrier auprès de la direction. L'élève ne sera jamais identifié nominativement sans accord écrit séparé.</div>` };
    },
  },
  {
    code: 'engagement_reglement', libelle: 'Engagement règlement intérieur', domaine: 'Vie scolaire & discipline',
    description: 'Prise de connaissance signée du règlement intérieur.',
    entete: 'mineur',
    parametres: [P.eleve(), P.texte('version', 'Version du règlement', 'Ex : v2026', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Engagement de respect du règlement intérieur',
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle }, matricule: el.matricule })}
        <p style="font-size:10.8pt;text-align:justify;margin-top:14px">Nous soussignés, d'une part l'élève nommé(e) ci-dessus, d'autre part son représentant légal, reconnaissons avoir reçu et <b>pris connaissance du règlement intérieur ${echapper(c.p.version || 'en vigueur')}</b> de l'établissement ${echapper(c.identite.nom)}, notamment des dispositions relatives à l'assiduité, la ponctualité, le respect des personnes et des biens, la tenue et l'usage du téléphone portable.</p>
        <p style="font-size:10.8pt;text-align:justify">Nous nous engageons à respecter l'intégralité de ce règlement et reconnaissons que tout manquement pourra donner lieu aux sanctions prévures (avertissement, blâme, exclusion temporaire).</p>
        ${doubleSignature(c.identite, { qui: 'L\'élève' }, { qui: 'Le représentant légal' })}
        ${zoneSignature(c.identite, { qui: 'La Direction (visa)' })}`,
      };
    },
  },
];

// ====================================================================
// DOMAINE 3 — FINANCES
// ====================================================================

async function situationEleve(ecoleId: string, eleveId: string) {
  const [echeances, paiements] = await Promise.all([
    db.echeanceFrais.findMany({ where: { eleveId, statut: { not: 'annulee' } }, include: { frais: true } }),
    db.paiement.findMany({ where: { eleveId, annule: false, eleve: { ecoleId } }, orderBy: { datePaiement: 'desc' } }),
  ]);
  const totalDu = echeances.reduce((s, e) => s + (e.montant - e.remise), 0);
  const totalPaye = echeances.reduce((s, e) => s + e.montantPaye, 0);
  return { echeances, paiements, totalDu, totalPaye, restant: totalDu - totalPaye };
}

const docsFinances: ModeleDoc[] = [
  {
    code: 'facture_scolarite', libelle: 'Facture de scolarité', domaine: 'Finances',
    description: 'Situation financière complète de la famille : frais, échéances, paiements.',
    entete: 'financier', permission: 'finances.voir',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const sit = await situationEleve(c.identite.ecoleId, el.id);
      const parent0 = el.parents?.[0]?.parent;
      return {
        titre: 'Situation de scolarité',
        sousTitre: echapper(el.classeActuelle?.libelle || ''),
        corps: tramePieceFinanciere({
          blocClientHtml: `
          <table style="width:100%;border-collapse:collapse;margin-top:10px">
            <tr>
              <td style="width:55%;vertical-align:top;border:1px solid #e0e0e0;padding:10px 12px;border-radius:6px">
                <div style="font-size:8.6pt;text-transform:uppercase;letter-spacing:1px;color:#555">Élève</div>
                <div style="font-weight:700;font-size:11pt">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
                <div style="font-size:9.6pt;color:#555">Matricule ${echapper(el.matricule || '—')} · ${echapper(el.classeActuelle?.libelle || '—')}</div>
                ${parent0 ? `<div style="font-size:9.6pt;margin-top:4px;color:#555">Responsable : ${echapper(parent0.prenom)} ${echapper(parent0.nom)}${parent0.telephone ? ' · ' + echapper(parent0.telephone) : ''}</div>` : ''}
              </td>
              <td style="width:3%"></td>
              <td style="vertical-align:top;border:1px solid #e0e0e0;padding:10px 12px;border-radius:6px">
                <div style="font-size:8.6pt;text-transform:uppercase;letter-spacing:1px;color:#555">Année scolaire</div>
                <div style="font-weight:700">${echapper(c.identite.anneeScolaire)}</div>
                <div style="font-size:9.6pt;color:#555;margin-top:4px">Référence client : ${echapper(el.matricule || el.id.slice(-8))}</div>
              </td>
            </tr>
          </table>`,
          tableauLignes: sit.echeances.map((e: any) => ({
            libelle: echapper(e.frais?.libelle || 'Frais'),
            details: `Échéance ${dateCourte(e.dateEcheance)}${e.remise ? ' · remise ' + formatXOF(e.remise) : ''}`,
            montant: e.montant - e.remise,
            statut: echapper(String(e.statut).replace('ee', 'ée')),
          })),
          totaux: [
            ['Montant en lettres', `${montantEnLettres(sit.restant, 'XOF')} (restant dû)`, false],
            ['Total dû (année)', formatXOF(sit.totalDu), false],
            ['Déjà réglé', formatXOF(sit.totalPaye), false],
            ['RESTANT DÛ', formatXOF(sit.restant), true],
          ],
          mentionPaiement: `Modes de paiement acceptés : espèces (caisse), chèque à l'ordre de ${c.identite.nom}, virement bancaire, mobile money. Référence à rappeler : ${echapper(el.matricule || el.id.slice(-8))}.`,
        }) + (sit.paiements.length ? `<div class="section-titre">Derniers paiements reçus</div>
          <table class="data"><thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th style="width:18%;text-align:right">Montant</th></tr></thead>
          <tbody>${sit.paiements.slice(0, 5).map((p: any) => `<tr><td>${dateCourte(p.datePaiement)}</td><td>${echapper(p.modePaiement)}</td><td>${echapper(p.referenceTransaction || '—')}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${formatXOF(p.montant)}</td></tr>`).join('')}</tbody></table>` : '')
        + zoneSignature(c.identite, { qui: 'Le Service Comptabilité' }),
      };
    },
  },
  {
    code: 'recu_paiement', libelle: 'Reçu de paiement', domaine: 'Finances',
    description: 'Reçu officiel : montant en chiffres ET en lettres.',
    entete: 'financier', permission: 'finances.voir',
    parametres: [{ cle: 'paiementId', libelle: 'Paiement', type: 'paiement', requis: true }],
    generer: async (c) => {
      const p = await db.paiement.findFirst({
        where: { id: c.p.paiementId, annule: false, eleve: { ecoleId: c.identite.ecoleId } },
        include: { eleve: { include: { classeActuelle: true } }, encaissePar: true, echeances: { include: { echeance: { include: { frais: true } } } } },
      });
      if (!p) throw new ActionError('Paiement introuvable (ou annulé).', 'INTROUVABLE');
      const el: any = p.eleve;
      return {
        titre: 'Reçu de paiement',
        sousTitre: `N° ${echapper(p.referenceTransaction || p.id.slice(-8).toUpperCase())}`,
        corps: `
        <p style="font-size:10.8pt;margin:10px 0">Reçu de la famille <b>${echapper(String(el?.nom || '—').toUpperCase())}</b> — la somme de :</p>
        <div class="total-encadre" style="font-size:14pt"><span>${formatXOF(p.montant, p.devise)}</span></div>
        <p style="text-align:center;font-size:11pt;font-style:italic;margin:8px 0">(${montantEnLettres(p.montant, p.devise)})</p>
        ${tableauKV([
          ['Élève', el ? `${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())} — ${echapper(el.classeActuelle?.libelle || '—')}` : '—'],
          ['En règlement de', (p as any).echeances?.length ? (p as any).echeances.map((pe: any) => echapper(pe.echeance?.frais?.libelle || 'échéance')).join(', ') : 'scolarité'],
          ['Mode de paiement', echapper(p.modePaiement) + (p.referenceTransaction ? ` — réf. ${echapper(p.referenceTransaction)}` : '')],
          ['Date', dateFr(p.datePaiement)],
          ['Encaissé par', (p as any).encaissePar ? `${(p as any).encaissePar.prenom} ${(p as any).encaissePar.nom}` : 'la caisse'],
        ])}
        <div class="cadre" style="text-align:center;margin-top:16px">Ce reçu fait foi du règlement de la somme indiquée ci-dessus.<br/>À conserver sans limitation de durée.</div>
        ${zoneSignature(c.identite, { qui: 'Le Service Comptabilité', mention: 'Cachet obligatoire' })}`,
      };
    },
  },
  {
    code: 'echeancier_personnalise', libelle: 'Échéancier personnalisé', domaine: 'Finances',
    description: 'Plan de paiement négocié — accord des deux parties.',
    entete: 'financier', permission: 'finances.voir',
    parametres: [P.eleve(), P.textarea('tranches', 'Tranches (une par ligne : date JJ/MM/AAAA | montant en F)', true)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const tranches = c.p.tranches.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [d, m] = l.split('|'); return { date: (d || '').trim(), montant: Number(String(m || '0').replace(/\s/g, '')) * 100 || 0 }; });
      const total = tranches.reduce((s, t) => s + t.montant, 0);
      return {
        titre: 'Échéancier de paiement',
        sousTitre: `Année ${echapper(c.identite.anneeScolaire)}`,
        corps: tramePieceFinanciere({
          blocClientHtml: blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } }),
          tableauLignes: tranches.map((t, i) => ({ libelle: `Tranche ${i + 1}`, details: `à régler le ${echapper(t.date)}`, montant: t.montant, statut: 'à échéance' })),
          totaux: [['TOTAL DE L\'ÉCHÉANCIER', formatXOF(total), true]],
          mentionPaiement: 'Le non-respect de deux échéances consécutives rend l\'intégralité du solde immédiatement exigible.',
        }) + `
        <div class="section-titre">Accord des parties</div>
        <p style="font-size:10.4pt">Le présent échéancier est convenu entre l'établissement et la famille. Il se substitue, pour le reste dû, au calendrier standard.</p>
        ${doubleSignature(c.identite, { qui: 'Le Responsable légal' }, { qui: 'La Direction' })}`,
      };
    },
  },
  {
    code: 'relance_impaye', libelle: 'Lettre de relance', domaine: 'Finances',
    description: 'Relance courtoise / ferme selon le niveau choisi.',
    entete: 'mineur', permission: 'finances.voir',
    parametres: [P.eleve(), { cle: 'niveau', libelle: 'Niveau de relance', type: 'select', requis: true, options: [{ valeur: '1', libelle: 'Relance 1 — courtoise' }, { valeur: '2', libelle: 'Relance 2 — ferme' }, { valeur: '3', libelle: 'Mise en demeure' }] }],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const sit = await situationEleve(c.identite.ecoleId, el.id);
      const enRetard = sit.echeances.filter((e: any) => (e.statut === 'impayee' || e.statut === 'partiel') && new Date(e.dateEcheance) < new Date());
      const montants = {
        '1': 'Nous vous rappelons, avec toute notre considération, qu\'une échéance de scolarité demeure en attente de règlement.',
        '2': 'Malgré notre précédent rappel, nous constatons que le solde de scolarité de votre enfant demeure impayé. Nous vous invitons à contacter la direction dans les plus brefs délais pour organiser le règlement ou un échéancier.',
        '3': 'À défaut de règlement du solde ci-dessous dans un délai de HUIT (8) jours à compter de la réception de la présente, l\'établissement se verra contraint de suspendre provisoirement l\'accès aux services annexes (cantine, transport) et à engager la procédure prévue au règlement financier.',
      }[c.p.niveau] || '';
      return {
        titre: '',
        corps: `
        <div style="text-align:center;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:2px 0 10px">${c.p.niveau === '3' ? 'Mise en demeure' : 'Lettre de relance'}</div>
        ${blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle }, matricule: el.matricule })}
        <p style="font-size:10.8pt;text-align:justify;margin-top:12px">${montants}</p>
        <div class="section-titre">Détail du solde</div>
        <table class="data"><thead><tr><th>Frais</th><th>Échéance</th><th style="width:20%;text-align:right">Restant dû</th></tr></thead>
        <tbody>${enRetard.map((e: any) => `<tr><td>${echapper(e.frais?.libelle || '—')}</td><td>${dateCourte(e.dateEcheance)}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${formatXOF(e.montant - e.remise - e.montantPaye)}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#999">Aucune échéance échue impayée</td></tr>'}</tbody></table>
        <div class="total-encadre" style="margin-top:10px"><span>SOLDE EXIGIBLE</span><span>${formatXOF(sit.restant)}</span></div>
        <p style="font-size:10.4pt;margin-top:12px">Le service comptabilité reste à votre disposition pour tout arrangement : ${echapper(c.identite.telephone || '')}.</p>
        ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'attestation_paiement', libelle: 'Attestation de paiement / non-endettement', domaine: 'Finances',
    description: 'Attestation que la famille est à jour — refusée si impayé.',
    entete: 'majeur', permission: 'finances.voir',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const sit = await situationEleve(c.identite.ecoleId, el.id);
      if (sit.restant > 0) throw new ActionError(`Impossible : solde impayé de ${formatXOF(sit.restant)}. Établissez un échéancier ou encaissez avant de produire cette attestation.`, 'IMPAYE');
      return {
        titre: 'Attestation de paiement',
        sousTitre: `Année scolaire ${echapper(c.identite.anneeScolaire)}`,
        corps: trameAttestation({
          titre: 'Attestation de paiement de scolarité',
          intro: `Le Service Comptabilité de l'établissement <b>${echapper(c.identite.nom)}</b> atteste que la famille de l'élève ci-dessous a réglé <b>l'intégralité des frais de scolarité</b> de l'année scolaire en cours.`,
          blocsHtml: blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } })
            + tableauKV([['Total réglé sur l\'année', formatXOF(sit.totalPaye)], ['Solde restant', '<b style="color:#047857">0 F — aucune dette</b>']]),
        }) + zoneSignature(c.identite, { qui: 'Le Service Comptabilité' }),
      };
    },
  },
  {
    code: 'notification_remise', libelle: 'Notification de bourse / remise', domaine: 'Finances',
    description: 'Attribution officielle d\'une remise (fratrie, bourse…).',
    entete: 'majeur', permission: 'finances.ecrire',
    parametres: [P.eleve(), { cle: 'type', libelle: 'Type de remise', type: 'select', requis: true, options: [{ valeur: 'Remise fratrie', libelle: 'Remise fratrie' }, { valeur: 'Bourse d\'excellence', libelle: 'Bourse d\'excellence' }, { valeur: 'Bourse sociale', libelle: 'Bourse sociale' }] }, P.texte('pourcentage', 'Pourcentage (%)'), P.date('effet', 'Date d\'effet')],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Notification de remise',
        sousTitre: echapper(c.p.type || ''),
        corps: trameNotification({
          titre: `Notification — ${c.p.type}`,
          objet: `Attribution d'une ${echapper(c.p.type)} au profit de ${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}`,
          corpsHtml: `Après examen de la situation de votre enfant, inscrit(e) en classe de <b>${echapper(el.classeActuelle?.libelle || '—')}</b>, la Direction a le plaisir de vous accorder une <b>${echapper(c.p.type)} de ${echapper(c.p.pourcentage)} %</b> sur les frais de scolarité restant dus, à compter du <b>${dateFr(c.p.effet)}</b>.<br/><br/>Cette remise est accordée à titre personnel, non cumulable au-delà des plafonds réglementaires, et révisable en cas de changement de situation.`,
          tableauDecisions: [['Bénéficiaire', `${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}`], ['Taux accordé', `${echapper(c.p.pourcentage)} %`], ['Date d\'effet', dateFr(c.p.effet)]],
        }) + zoneSignature(c.identite),
      };
    },
  },
  {
    code: 'avoir_scolarite', libelle: 'Avoir', domaine: 'Finances',
    description: 'Crédit accordé à la famille (erreur, départ…).',
    entete: 'financier', permission: 'finances.ecrire',
    parametres: [P.eleve(), P.texte('montant', 'Montant de l\'avoir (F CFA)'), P.texte('motif', 'Motif'), { cle: 'imputation', libelle: 'Imputation', type: 'select', requis: false, options: [{ valeur: 'prochaine échéance', libelle: 'Imputé sur la prochaine échéance' }, { valeur: 'remboursement', libelle: 'Remboursement à la famille' }] }],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const montant = Number((c.p.montant || '0').replace(/\s/g, '')) * 100;
      return {
        titre: 'Avoir',
        sousTitre: 'Pièce comptable de crédit',
        corps: tramePieceFinanciere({
          blocClientHtml: blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } }),
          tableauLignes: [{ libelle: 'Avoir — ' + echapper(c.p.motif), details: 'Crédit accordé à la famille', montant }],
          totaux: [['Montant en lettres', montantEnLettres(montant), false], ['TOTAL DE L\'AVOIR', formatXOF(montant), true]],
          mentionPaiement: `Imputation : ${echapper(c.p.imputation || 'prochaine échéance')}.`,
        }) + zoneSignature(c.identite, { qui: 'La Direction' }),
      };
    },
  },
  {
    code: 'etat_recettes_depenses', libelle: 'État recettes-dépenses', domaine: 'Finances',
    description: 'Rapport financier de période : recettes par nature, solde.',
    entete: 'majeur', permission: 'finances.voir',
    parametres: [{ cle: 'mois', libelle: 'Mois (AAAA-MM)', type: 'texte', requis: false, aide: 'Laisser vide = année entière' }],
    generer: async (c) => {
      const debut = c.p.mois ? new Date(c.p.mois + '-01T00:00:00Z') : new Date(new Date().getFullYear(), 8, 1);
      const fin = c.p.mois ? new Date(debut.getFullYear(), debut.getMonth() + 1, 0) : new Date(debut.getFullYear() + 1, 7, 31);
      const paiements = await db.paiement.findMany({ where: { ecoleId: c.identite.ecoleId, annule: false, datePaiement: { gte: debut, lte: fin } } });
      const depenses = await db.depense.findMany({ where: { ecoleId: c.identite.ecoleId, annulee: false, dateDepense: { gte: debut, lte: fin } } });
      const totalRec = paiements.reduce((s, p) => s + p.montant, 0);
      const totalDep = depenses.reduce((s, d) => s + d.montant, 0);
      const parCategorie = new Map<string, number>();
      for (const d of depenses) parCategorie.set(d.categorie, (parCategorie.get(d.categorie) || 0) + d.montant);
      return {
        titre: 'État des recettes et des dépenses',
        sousTitre: c.p.mois ? `Période : ${echapper(c.p.mois)}` : `Période : année ${echapper(c.identite.anneeScolaire)}`,
        corps: `
        <div class="section-titre">Recettes (encaissements)</div>
        <table class="data"><tr><td><b>Total des encaissements</b></td><td style="width:26%;text-align:right;font-weight:800;font-variant-numeric:tabular-nums">${formatXOF(totalRec)}</td><td style="width:14%;text-align:right">${paiements.length} pièce(s)</td></tr></table>
        <div class="section-titre">Dépenses par nature</div>
        <table class="data"><thead><tr><th>Catégorie</th><th style="width:26%;text-align:right">Montant</th></tr></thead>
        <tbody>${[...parCategorie.entries()].map(([k, v]) => `<tr><td>${echapper(k)}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${formatXOF(v)}</td></tr>`).join('') || '<tr><td colspan="2" style="color:#999">Aucune dépense</td></tr>'}
        <tr><td style="font-weight:700">TOTAL DÉPENSES</td><td style="text-align:right;font-weight:800">${formatXOF(totalDep)}</td></tr></tbody></table>
        <div class="total-encadre" style="margin-top:14px"><span>SOLDE DE LA PÉRIODE</span><span>${formatXOF(totalRec - totalDep)}</span></div>
        ${doubleSignature(c.identite, { qui: 'Le Comptable' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
  {
    code: 'budget_previsionnel', libelle: 'Budget prévisionnel', domaine: 'Finances',
    description: 'Prévisions vs réalisé par poste.',
    entete: 'majeur', permission: 'finances.voir',
    parametres: [{ cle: 'lignes', libelle: 'Postes (une par ligne : poste | prévu F | réalisé F)', type: 'textarea', requis: true }],
    generer: async (c) => {
      const lignes = c.p.lignes.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [p, prev, real] = l.split('|'); return { p: (p || '').trim(), prev: Number(String(prev || '0').replace(/\s/g, '')) * 100 || 0, real: Number(String(real || '0').replace(/\s/g, '')) * 100 || 0 }; });
      return {
        titre: 'Budget prévisionnel',
        sousTitre: `Année ${echapper(c.identite.anneeScolaire)}`,
        corps: `
        <table class="data"><thead><tr><th>Poste</th><th style="width:18%;text-align:right">Prévu</th><th style="width:18%;text-align:right">Réalisé</th><th style="width:16%;text-align:right">Écart</th></tr></thead>
        <tbody>${lignes.map((l) => `<tr><td>${echapper(l.p)}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${formatXOF(l.prev)}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${formatXOF(l.real)}</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:${l.real > l.prev ? '#b91c1c' : '#047857'}">${formatXOF(l.real - l.prev)}</td></tr>`).join('')}</tbody></table>
        ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'ordre_virement', libelle: 'Ordre de virement de paie', domaine: 'Finances',
    description: 'Édition PDF de contrôle du fichier bancaire.',
    entete: 'financier', permission: 'rh.gerer',
    parametres: [{ cle: 'periode', libelle: 'Période de paie (AAAA-MM)', type: 'texte', requis: true }],
    generer: async (c) => {
      const bulletins = await db.bulletinPaie.findMany({
        where: { ecoleId: c.identite.ecoleId, periode: c.p.periode, statut: 'paye' },
        include: { personnel: true },
        orderBy: { personnel: { nom: 'asc' } },
      });
      if (!bulletins.length) throw new ActionError('Aucun bulletin payé pour cette période.', 'VIDE');
      const total = bulletins.reduce((s, b) => s + b.netAPayer, 0);
      return {
        titre: 'Ordre de virement — paie',
        sousTitre: `Période ${echapper(c.p.periode)} · ${bulletins.length} bénéficiaire(s)`,
        corps: `
        <table class="data"><thead><tr><th>Bénéficiaire</th><th>Matricule</th><th>RIB</th><th style="width:20%;text-align:right">Net à payer</th></tr></thead>
        <tbody>${bulletins.map((b: any) => `<tr><td>${echapper(b.personnel?.prenom)} ${echapper(String(b.personnel?.nom || '').toUpperCase())}</td><td>${echapper(b.personnel?.matricule || '—')}</td><td style="font-family:monospace;font-size:8.6pt">${echapper((b.personnel?.rib || '—').replace(/(\d{4})(?=\d)/g, '$1 '))}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${formatXOF(b.netAPayer)}</td></tr>`).join('')}</tbody></table>
        <div class="total-encadre" style="margin-top:12px"><span>TOTAL À VIRER (${montantEnLettres(total)})</span><span>${formatXOF(total)}</span></div>
        ${mention('Contrôle : la somme des virements doit égaler la somme des nets à payer des bulletins réglés.')}
        ${doubleSignature(c.identite, { qui: 'Le Comptable' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
];

// ====================================================================
// DOMAINE 4 — RH & PERSONNEL
// ====================================================================

async function personnelComplet(ecoleId: string, personnelId: string) {
  const p = await db.personnel.findFirst({
    where: { id: personnelId, ecoleId, deletedAt: null },
    include: { utilisateur: true, contrats: { where: { actif: true }, orderBy: { dateDebut: 'desc' } } },
  });
  if (!p) throw new ActionError('Personnel introuvable dans votre école.', 'INTROUVABLE');
  return p as any;
}

const docsRh: ModeleDoc[] = [
  {
    code: 'contrat_travail', libelle: 'Contrat de travail', domaine: 'RH & personnel',
    description: 'Contrat CDI/CDD complet en 2 exemplaires.',
    entete: 'majeur', permission: 'rh.gerer', confidential: true,
    parametres: [P.personnel(), { cle: 'type', libelle: 'Type de contrat', type: 'select', requis: true, options: [{ valeur: 'CDI', libelle: 'CDI' }, { valeur: 'CDD', libelle: 'CDD' }, { valeur: 'Vacataire', libelle: 'Vacataire' }] }, P.texte('fonction', 'Fonction / poste'), P.texte('salaire', 'Salaire brut mensuel (F)'), P.date('debut', 'Début du contrat'), P.texte('essai', 'Période d\'essai', 'Ex : 3 mois', false)],
    generer: async (c) => {
      const p = await personnelComplet(c.identite.ecoleId, c.p.personnelId);
      const salaire = Number((c.p.salaire || '0').replace(/\s/g, '')) * 100;
      return {
        titre: 'Contrat de travail',
        sousTitre: `${echapper(c.p.type)} — établi en deux (2) exemplaires`,
        corps: `
        <p style="font-size:10.8pt;text-align:justify">Entre l'établissement <b>${echapper(c.identite.nom)}</b>, représenté par son Chef d'établissement, ci-après « l'employeur », et :</p>
        ${tableauKV([
          ['Salarié', `${echapper(p.prenom)} ${echapper(String(p.nom).toUpperCase())}`], ['Matricule', echapper(p.matricule || '—')],
          ['Né(e) le', dateFr(p.dateNaissance)], ['N° sécurité sociale', echapper(p.numeroSecuriteSociale || '—')],
          ['Fonction', echapper(c.p.fonction)], ['Type de contrat', echapper(c.p.type)],
          ['Rémunération brute mensuelle', `<b>${formatXOF(salaire)}</b> (${montantEnLettres(salaire)})`],
          ['Début du contrat', dateFr(c.p.debut)], ['Période d\'essai', echapper(c.p.essai || 'conformément à la convention collective')],
        ])}
        <div class="section-titre">Article 1 — Objet</div>
        <p style="font-size:10.4pt;text-align:justify">Le présent contrat a pour objet l'engagement du salarié à la fonction de ${echapper(c.p.fonction)} conformément à la fiche de poste annexée.</p>
        <div class="section-titre">Article 2 — Durée et essai</div>
        <p style="font-size:10.4pt;text-align:justify">Le contrat prend effet le ${dateFr(c.p.debut)}. ${c.p.type === 'CDD' ? 'Il est conclu pour une durée déterminée et prend fin de plein droit à son échéance.' : 'Il est conclu pour une durée indéterminée.'} Une période d'essai de ${echapper(c.p.essai || '…')} permet à chacune des parties de se départir sans préavis ni indemnité.</p>
        <div class="section-titre">Article 3 — Rémunération</div>
        <p style="font-size:10.4pt;text-align:justify">Le salarié perçoit une rémunération brute mensuelle de ${formatXOF(salaire)}, payable à terme échu par virement bancaire, augmentée des primes éventuelles définies par le règlement intérieur.</p>
        <div class="section-titre">Article 4 — Obligations réciproques</div>
        <p style="font-size:10.4pt;text-align:justify">Le salarié s'engage à exercer ses fonctions avec conscience professionnelle, à respecter le règlement intérieur et l'obligation de discrétion, notamment pour toutes informations relatives aux élèves. L'employeur garantit les conditions de travail conformes à la réglementation en vigueur.</p>
        <div class="section-titre">Article 5 — Litiges</div>
        <p style="font-size:10.4pt;text-align:justify">Tout différend relatif au présent contrat sera soumis en premier lieu à une tentative de règlement amiable, puis aux juridictions compétentes.</p>
        ${mention('Fait en deux (2) exemplaires originaux, dont un remis au salarié. Chaque page est paraphée par les deux parties.')}
        ${doubleSignature(c.identite, { qui: 'Le Salarié (précédé de la mention « lu et approuvé »)' }, { qui: 'Le Chef d\'Établissement (cachet)' })}`,
      };
    },
  },
  {
    code: 'avenant', libelle: 'Avenant au contrat', domaine: 'RH & personnel',
    description: 'Modification d\'une clause du contrat initial.',
    entete: 'majeur', permission: 'rh.gerer', confidential: true,
    parametres: [P.personnel(), P.texte('reference', 'Référence du contrat initial'), P.texte('objet', 'Objet de l\'avenant'), P.textarea('modifications', 'Clauses modifiées (une par ligne)', true)],
    generer: async (c) => {
      const p = await personnelComplet(c.identite.ecoleId, c.p.personnelId);
      return {
        titre: 'Avenant au contrat de travail',
        sousTitre: `Contrat ${echapper(c.p.reference)}`,
        corps: `
        <p style="font-size:10.8pt">Entre l'établissement <b>${echapper(c.identite.nom)}</b> et <b>${echapper(p.prenom)} ${echapper(String(p.nom).toUpperCase())}</b> (${echapper(p.matricule || '—')}), il est convenu ce qui suit :</p>
        <div class="section-titre">${echapper(c.p.objet)}</div>
        <div style="font-size:10.6pt;line-height:1.9">${c.p.modifications.split('\n').filter(Boolean).map((l) => `• ${echapper(l.trim())}`).join('<br/>')}</div>
        <div class="cadre" style="margin-top:12px">Toutes les autres clauses du contrat initial demeurent inchangées et continuent de produire leur plein effet.</div>
        ${doubleSignature(c.identite, { qui: 'Le Salarié' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
  {
    code: 'bulletin_paie', libelle: 'Bulletin de paie', domaine: 'RH & personnel',
    description: 'Feuille de paie complète du personnel.',
    entete: 'financier', permission: 'rh.gerer', confidential: true,
    parametres: [{ cle: 'bulletinPaieId', libelle: 'Bulletin de paie', type: 'bulletinPaie', requis: true }],
    generer: async (c) => {
      const b = await db.bulletinPaie.findFirst({
        where: { id: c.p.bulletinPaieId, ecoleId: c.identite.ecoleId },
        include: { personnel: true, lignes: true, cotisations: true },
      });
      if (!b) throw new ActionError('Bulletin de paie introuvable.', 'INTROUVABLE');
      const p: any = b.personnel;
      return {
        titre: `Bulletin de paie — ${echapper(b.periode)}`,
        sousTitre: echapper(String(b.statut).toUpperCase()),
        corps: `
        <table style="width:100%;border-collapse:collapse;margin:8px 0">
          <tr>
            <td style="width:50%;border:1px solid #e0e0e0;padding:9px 11px;border-radius:6px;vertical-align:top">
              <div style="font-size:8.4pt;text-transform:uppercase;letter-spacing:1px;color:#555">Employeur</div>
              <div style="font-weight:700">${echapper(c.identite.nom)}</div>
              <div style="font-size:9.4pt;color:#555">${echapper(c.identite.adresse)}${c.identite.identifiants.ninea ? ' · NINEA ' + echapper(c.identite.identifiants.ninea) : ''}</div>
            </td>
            <td style="width:3%"></td>
            <td style="border:1px solid #e0e0e0;padding:9px 11px;border-radius:6px;vertical-align:top">
              <div style="font-size:8.4pt;text-transform:uppercase;letter-spacing:1px;color:#555">Salarié</div>
              <div style="font-weight:700">${echapper(p?.prenom)} ${echapper(String(p?.nom || '').toUpperCase())} · ${echapper(p?.matricule || '—')}</div>
              <div style="font-size:9.4pt;color:#555">Embauché(e) le ${dateFr(p?.dateEmbauche)} · ${echapper(p?.typeContrat || 'CDI')}</div>
            </td>
          </tr>
        </table>
        <table class="data">
          <thead><tr><th style="width:34%">Libellé</th><th>Base</th><th style="width:14%;text-align:right">Gains</th><th style="width:16%;text-align:right">Retenues</th></tr></thead>
          <tbody>
            ${(b.lignes as any[]).map((l) => `<tr><td>${echapper(l.libelle)}</td><td style="font-size:9pt">${l.quantite ? echapper(String(l.quantite)) : '—'}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${l.sens === 'plus' ? formatXOF(l.montant) : ''}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${l.sens === 'moins' ? formatXOF(l.montant) : ''}</td></tr>`).join('')}
            <tr><td colspan="2" style="text-align:right;font-weight:700">TOTAUX</td><td style="text-align:right;font-weight:700">${formatXOF(b.salaireBrut)}</td><td style="text-align:right;font-weight:700">${formatXOF(b.cotisationsTotales)}</td></tr>
          </tbody>
        </table>
        <div class="total-encadre" style="margin-top:12px"><span>NET À PAYER</span><span>${formatXOF(b.netAPayer)}</span></div>
        <p style="text-align:center;font-style:italic;font-size:9.6pt;margin:6px 0">(${montantEnLettres(b.netAPayer)})</p>
        ${tableauKV([['Mode de règlement', 'Virement bancaire'], ['Période', echapper(b.periode)], ['Édité le', dateFr(b.dateEdition)]])}
        ${mention('Bulletin établi conformément à la réglementation en vigueur. À conserver sans limitation de temps. Cumuls imposables disponibles auprès du service RH.')}`,
      };
    },
  },
  {
    code: 'certificat_travail', libelle: 'Certificat de travail', domaine: 'RH & personnel',
    description: 'Délivré obligatoirement à la fin du contrat — neutre.',
    entete: 'majeur', permission: 'rh.gerer', confidential: true,
    parametres: [P.personnel()],
    generer: async (c) => {
      const p = await personnelComplet(c.identite.ecoleId, c.p.personnelId);
      return {
        titre: 'Certificat de travail',
        corps: trameAttestation({
          titre: 'Certificat de travail',
          intro: `L'établissement <b>${echapper(c.identite.nom)}</b> certifie que ${echapper(p.prenom)} ${echapper(String(p.nom).toUpperCase())}, matricule ${echapper(p.matricule || '—')}, a été employé(e) en qualité de <b>${echapper(p.fonction || 'membre du personnel')}</b> au sein de cet établissement :`,
          blocsHtml: tableauKV([
            ['Date d\'embauche', dateFr(p.dateEmbauche)],
            ['Date de fin de contrat', p.dateSortie ? dateFr(p.dateSortie) : 'en poste à ce jour'],
            ['Fonctions exercées', echapper(p.fonction || '—')],
            ['Type de contrat', echapper(p.typeContrat || '—')],
          ]),
          finale: 'Nous lui souhaitons pleine réussite dans la suite de son parcours professionnel.',
        }) + zoneSignature(c.identite) + mention('Document délivré à la demande de l\'intéressé(e), sans mention d\'aucune appréciation disciplinaire.'),
      };
    },
  },
  {
    code: 'attestation_travail', libelle: 'Attestation de travail / de salaire', domaine: 'RH & personnel',
    description: 'Présentation à un bailleur, banque…',
    entete: 'majeur', permission: 'rh.gerer', confidential: true,
    parametres: [P.personnel(), { cle: 'avecSalaire', libelle: 'Inclure le salaire', type: 'select', requis: true, options: [{ valeur: 'oui', libelle: 'Oui — avec salaire' }, { valeur: 'non', libelle: 'Non — fonction seulement' }] }, P.texte('destinataire', 'Destinataire (banque, bailleur…)', '', false)],
    generer: async (c) => {
      const p = await personnelComplet(c.identite.ecoleId, c.p.personnelId);
      const contrat = p.contrats?.[0];
      const sal = contrat?.salaireBrut ?? p.salaireBrut;
      return {
        titre: 'Attestation de travail',
        corps: trameAttestation({
          titre: c.p.avecSalaire === 'oui' ? 'Attestation de travail et de rémunération' : 'Attestation de travail',
          intro: `L'établissement <b>${echapper(c.identite.nom)}</b> atteste que ${echapper(p.prenom)} ${echapper(String(p.nom).toUpperCase())} est employé(e) au sein de l'établissement depuis le <b>${dateFr(p.dateEmbauche)}</b> en qualité de <b>${echapper(p.fonction || 'membre du personnel')}</b>, sous contrat ${echapper(p.typeContrat || '—')}${c.p.destinataire ? `, et ce à l'attention de ${echapper(c.p.destinataire)}` : ''}.`,
          blocsHtml: c.p.avecSalaire === 'oui' && sal ? tableauKV([['Rémunération brute mensuelle', `<b>${formatXOF(sal)}</b>`], ['Rémunération nette mensuelle moyenne', formatXOF(Math.round(sal * 0.79))]]) : '',
          finale: 'La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit, sans engagement de l\'employeur au-delà des informations constatées.',
        }) + zoneSignature(c.identite),
      };
    },
  },
  {
    code: 'demande_conge', libelle: 'Demande de congé / autorisation d\'absence', domaine: 'RH & personnel',
    description: 'Formulaire avec visa hiérarchique.',
    entete: 'mineur', permission: 'rh.gerer', confidential: true,
    parametres: [P.personnel(), { cle: 'type', libelle: 'Type', type: 'select', requis: true, options: [{ valeur: 'Congé annuel', libelle: 'Congé annuel' }, { valeur: 'Congé maladie', libelle: 'Congé maladie' }, { valeur: 'Congé exceptionnel', libelle: 'Congé exceptionnel' }, { valeur: 'Absence non payée', libelle: 'Absence non payée' }] }, P.date('debut', 'Du'), P.date('fin', 'Au'), P.textarea('motif', 'Motif', false)],
    generer: async (c) => {
      const p = await personnelComplet(c.identite.ecoleId, c.p.personnelId);
      return {
        titre: 'Demande de congé',
        corps: `
        <table style="width:100%;border-collapse:collapse"><tr>
          <td style="font-size:11pt"><b>${echapper(p.prenom)} ${echapper(String(p.nom).toUpperCase())}</b><div style="font-size:9.6pt;color:#555">${echapper(p.fonction || '—')} · ${echapper(p.matricule || '—')}</div></td>
          <td style="text-align:right;font-size:9.8pt">Demande formulée le ${dateFr(new Date())}</td>
        </tr></table>
        ${tableauKV([
          ['Type de congé', echapper(c.p.type)], ['Période', `du <b>${dateFr(c.p.debut)}</b> au <b>${dateFr(c.p.fin)}</b>`],
          ['Motif', echapper(c.p.motif || '—')],
          ['Justificatif joint', '☐ Oui ☐ Non ☐ Non applicable'],
        ])}
        <div class="section-titre">Décision hiérarchique</div>
        <table class="data"><tr><td style="width:36%;font-weight:600;background:#f4f8f7">Décision</td><td>☐ <b>Accordé(e)</b> &nbsp;&nbsp; ☐ <b>Refusée</b> &nbsp;&nbsp; ☐ Accordée sur période modifiée</td></tr>
        <tr><td style="font-weight:600;background:#f4f8f7">Date et signature</td><td style="height:34px"></td></tr>
        <tr><td style="font-weight:600;background:#f4f8f7">Décompte RH (jours débités)</td><td></td></tr></table>`,
      };
    },
  },
  {
    code: 'evaluation_personnel', libelle: 'Compte rendu d\'entretien annuel', domaine: 'RH & personnel',
    description: 'Évaluation avec objectifs N+1.',
    entete: 'majeur', permission: 'rh.gerer', confidential: true,
    parametres: [{ cle: 'evaluationRhId', libelle: 'Évaluation', type: 'evaluationRh', requis: true }, P.textarea('objectifs', 'Objectifs N+1 (un par ligne)', false)],
    generer: async (c) => {
      const ev = await (db as any).evaluationPersonnel.findFirst({
        where: { id: c.p.evaluationRhId, personnel: { ecoleId: c.identite.ecoleId } },
        include: { personnel: true },
      });
      if (!ev) throw new ActionError('Évaluation introuvable.', 'INTROUVABLE');
      let criteres: Array<{ critere?: string; note?: number }> = [];
      try { criteres = JSON.parse(ev.criteres || '[]'); } catch { /* vide */ }
      return {
        titre: 'Entretien annuel d\'évaluation',
        sousTitre: `${echapper(ev.personnel?.prenom)} ${echapper(String(ev.personnel?.nom || '').toUpperCase())} — période ${echapper(ev.periode)}`,
        corps: `
        ${tableauKV([['Salarié', `${echapper(ev.personnel?.prenom)} ${echapper(String(ev.personnel?.nom || '').toUpperCase())}`], ['Fonction', echapper(ev.personnel?.fonction || '—')], ['Période évaluée', echapper(ev.periode)], ['Date de l\'entretien', dateFr(ev.dateEvaluation)]])}
        <div class="section-titre">Grille d'évaluation</div>
        <table class="data"><thead><tr><th>Critère</th><th style="width:16%;text-align:center">Note /5</th></tr></thead>
        <tbody>${criteres.map((x) => `<tr><td>${echapper(x.critere || '—')}</td><td style="text-align:center;font-weight:700">${echapper(String(x.note ?? '—'))}</td></tr>`).join('') || '<tr><td colspan="2" style="color:#999">Grille non renseignée</td></tr>'}</tbody></table>
        ${ev.commentaireGlobal ? `<div class="section-titre">Appréciation générale</div><div class="cadre" style="font-style:italic">${echapper(ev.commentaireGlobal)}</div>` : ''}
        ${c.p.objectifs ? `<div class="section-titre">Objectifs de l'année à venir</div><ol style="font-size:10.4pt;line-height:1.8;margin-left:20px">${c.p.objectifs.split('\n').filter(Boolean).map((o) => `<li>${echapper(o.trim())}</li>`).join('')}</ol>` : ''}
        ${doubleSignature(c.identite, { qui: 'Le Salarié (visa — ne vaut pas accord)' }, { qui: 'L\'Évaluateur' })}`,
      };
    },
  },
  {
    code: 'avertissement_personnel', libelle: 'Avertissement disciplinaire (personnel)', domaine: 'RH & personnel',
    description: 'Sanction notifiée à un membre du personnel.',
    entete: 'mineur', permission: 'rh.gerer', confidential: true,
    parametres: [P.personnel(), P.texte('motif', 'Faits reprochés'), P.texte('dateFaits', 'Date des faits')],
    generer: async (c) => {
      const p = await personnelComplet(c.identite.ecoleId, c.p.personnelId);
      return {
        titre: 'Avertissement',
        corps: `
        <div style="text-align:center;font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:2px 0 10px">Avertissement disciplinaire</div>
        <p style="font-size:10.8pt">À l'attention de <b>${echapper(p.prenom)} ${echapper(String(p.nom).toUpperCase())}</b> — ${echapper(p.fonction || '—')}</p>
        <p style="font-size:10.8pt;text-align:justify;margin-top:10px">Les faits suivants, constatés le ${dateFr(c.p.dateFaits)}, vous sont reprochés :</p>
        <div class="cadre" style="text-align:justify">${echapper(c.p.motif)}</div>
        <p style="font-size:10.8pt;text-align:justify;margin-top:10px">Ces faits constituent un manquement à vos obligations professionnelles. Par la présente, il vous est notifié un <b>avertissement</b> qui sera versé à votre dossier. Nous vous invitons à vous rapprocher de votre supérieur hiérarchique pour toute explication.</p>
        ${doubleSignature(c.identite, { qui: 'Le Salarié (reçu le)' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },

// ====================================================================
// VIE SCOLAIRE+ — billet de retard, convocation conseil de discipline
// ====================================================================

  {
    code: 'billet_retard', libelle: 'Billet de retard', domaine: 'Vie scolaire & discipline',
    description: "Billet numéroté remis à l'élève retardataire (à conserver dans le carnet).",
    entete: 'mineur', permission: 'presences.saisir',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const r = await db.retard.findFirst({ where: { eleveId: el.id }, orderBy: { dateHeure: 'desc' } });
      return {
        titre: '',
        corps: `
        <div style="display:flex;justify-content:center">
        <div style="width:430px;border:2.5px solid ${c.identite.couleur};border-radius:12px;overflow:hidden">
          <div style="background:${c.identite.couleur};color:#fff;padding:8px 14px;font-weight:800;letter-spacing:2px;text-align:center">BILLET DE RETARD</div>
          <div style="padding:16px">
            <div style="font-size:14pt;font-weight:800;text-align:center">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
            <div style="text-align:center;color:#444;margin-top:2px">${echapper(el.classeActuelle?.libelle || '')} · Matricule ${echapper(el.matricule || '—')}</div>
            <table style="width:100%;margin-top:14px;font-size:10.6pt">
              <tr><td style="padding:4px 0"><b>N° du billet :</b> ${echapper(r?.billetNumero ?? '—')}</td><td><b>Date :</b> ${r ? dateFr(r.dateHeure) : dateFr(new Date())}</td></tr>
              <tr><td style="padding:4px 0"><b>Heure d'arrivée :</b> ${r ? r.dateHeure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td><td><b>Retard :</b> ${r?.dureeMinutes ?? 15} min</td></tr>
              <tr><td colspan="2" style="padding:4px 0"><b>Motif :</b> ${echapper(r?.motif ?? 'non communiqué')}</td></tr>
            </table>
            <div style="margin-top:14px;font-size:9pt;color:#555;border-top:1px dashed #bbb;padding-top:8px">
              Ce billet doit être présenté au professeur et signé par le parent. Trois retards non justifiés sur 30 jours entraînent une convocation de la vie scolaire.
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:16px;font-size:9pt">
              <div>Signature de l'élève : ………………………</div>
              <div>Signature du parent : ………………………</div>
            </div>
          </div>
        </div>
        </div>`,
      };
    },
  },
  {
    code: 'convocation_conseil_discipline', libelle: 'Convocation conseil de discipline', domaine: 'Vie scolaire & discipline',
    description: "Convocation officielle de l'élève et de sa famille devant le conseil de discipline.",
    entete: 'majeur', permission: 'vie_scolaire.gerer',
    parametres: [{ cle: 'conseilId', libelle: 'Conseil (laisser vide = dernier)', type: 'texte', requis: false }],
    generer: async (c) => {
      const conseil = c.p.conseilId
        ? await db.conseilDiscipline.findFirst({ where: { id: c.p.conseilId, ecoleId: c.identite.ecoleId }, include: { eleve: { include: { classeActuelle: true } } } })
        : await db.conseilDiscipline.findFirst({ where: { ecoleId: c.identite.ecoleId }, orderBy: { dateConseil: 'desc' }, include: { eleve: { include: { classeActuelle: true } } } });
      if (!conseil) throw new ActionError('Aucun conseil de discipline trouvé.', 'INTROUVABLE');
      return {
        titre: 'Convocation au conseil de discipline',
        sousTitre: `${echapper(conseil.eleve.prenom)} ${echapper(String(conseil.eleve.nom).toUpperCase())} · ${echapper(conseil.eleve.classeActuelle?.libelle || '')}`,
        corps: `
        ${trameConvocation({
          identite: c.identite,
          destinataireHtml: `<b>À la famille de ${echapper(conseil.eleve.prenom)} ${echapper(conseil.eleve.nom)}</b>`,
          motif: 'Convocation devant le conseil de discipline',
          dateHeure: `${dateFr(conseil.dateConseil)} à ${conseil.dateConseil.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
          lieu: 'Salle de réunion de la direction',
          ordreDuJour: ["Exposé des faits", "Audition de l'élève", "Audition des représentants légaux", "Avis des membres du conseil", "Décision du chef d'établissement"],
          obligatoire: true,
          signataire: "Le Chef d'Établissement",
        }) + zoneSignature(c.identite, { qui: "Le Chef d'Établissement" })}
        <div class="section-titre">Faits reprochés</div>
        <div style="font-size:10.6pt;white-space:pre-wrap">${echapper(conseil.faits)}</div>`,
      };
    },
  },
];

export { docsVieScolaire, docsFinances, docsRh };
