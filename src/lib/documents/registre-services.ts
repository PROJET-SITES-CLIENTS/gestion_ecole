// ====================================================================
// REGISTRE — domaines 5 à 8 : santé, communication, admissions, services
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
// DOMAINE 5 — SANTÉ (confidentiel)
// ====================================================================

const docsSante: ModeleDoc[] = [
  {
    code: 'fiche_sante', libelle: 'Fiche de santé scolaire', domaine: 'Santé & bien-être',
    description: 'Fiche médicale confidentielle (accès infirmerie/direction uniquement).',
    entete: 'majeur', confidential: true, permission: 'sante.gerer',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const fiche = await db.ficheSante.findFirst({ where: { eleveId: el.id }, include: { vaccinations: true } });
      const parent0 = el.parents?.[0]?.parent;
      return {
        titre: 'Fiche de santé scolaire',
        sousTitre: 'STRICTEMENT CONFIDENTIEL',
        corps: `
        ${blocEleve({
          prenom: el.prenom, nom: el.nom, matricule: el.matricule, dateNaissance: el.dateNaissance,
          classe: { libelle: el.classeActuelle?.libelle },
          lignes: [['Groupe sanguin', fiche?.groupeSanguin || 'inconnu'], ...parentsLignes(el)],
        })}
        ${tableauKV([
          ['Allergies', `<b style="color:${(fiche?.allergies || '').toLowerCase().includes('aucune') || !fiche?.allergies ? '#047857' : '#b91c1c'}">${echapper(fiche?.allergies || 'aucune signalée')}</b>`],
          ['Conditions chroniques', echapper(fiche?.antecedents || 'aucune signalée')],
          ['Traitements en cours', echapper(fiche?.traitementsEnCours || 'aucun')],
          ['Médecin traitant', echapper(fiche?.medecinTraitant || '—')],
        ], 'A — État de santé')}
        ${tableauKV([
          ['Contact d\'urgence — nom', echapper(fiche?.contactUrgenceNom || parent0?.nom || '—')],
          ['Contact d\'urgence — téléphone', `<b>${echapper(fiche?.telephoneUrgence || parent0?.telephone || '—')}</b>`],
          ['Autorisation de traitement', fiche?.autorisationTraitement ? '<span style="color:#047857;font-weight:700">ACCORDÉE par le responsable légal</span>' : '<span style="color:#b91c1c;font-weight:700">NON ACCORDÉE</span>'],
        ], 'B — Urgences')}
        <div class="section-titre">C — Vaccinations</div>
        <table class="data"><thead><tr><th>Vaccin</th><th style="width:22%">Date</th><th style="width:22%">Rappel</th></tr></thead>
        <tbody>${(fiche?.vaccinations ?? []).map((v: any) => `<tr><td>${echapper(v.vaccin || '—')}</td><td>${dateCourte(v.date)}</td><td>${dateCourte(v.dateRappel)}</td></tr>`).join('') || '<tr><td colspan="3" style="color:#999">Aucun enregistrement</td></tr>'}</tbody></table>
        ${mention('Fiche mise à jour le ' + dateFr(fiche?.dateMiseAJour || new Date()) + '. Accès restreint : infirmerie et direction uniquement — toute consultation est journalisée.')}
        ${doubleSignature(c.identite, { qui: 'Le Responsable légal' }, { qui: 'L\'Infirmier(ère)' })}`,
      };
    },
  },
  {
    code: 'rapport_infirmerie', libelle: 'Rapport de passage à l\'infirmerie', domaine: 'Santé & bien-être',
    description: 'Compte rendu d\'un passage (soins, issue, parents notifiés).',
    entete: 'majeur', confidential: true, permission: 'sante.gerer',
    parametres: [{ cle: 'passageId', libelle: 'Passage', type: 'passage', requis: true }],
    generer: async (c) => {
      const pass = await (db as any).passageInfirmerie.findFirst({
        where: { id: c.p.passageId, ecoleId: c.identite.ecoleId },
        include: { eleve: { include: { classeActuelle: true } } },
      });
      if (!pass) throw new ActionError('Passage introuvable.', 'INTROUVABLE');
      return {
        titre: 'Rapport de passage à l\'infirmerie',
        sousTitre: dateFr(pass.datePassage),
        corps: `
        ${blocEleve({ prenom: pass.eleve.prenom, nom: pass.eleve.nom, classe: { libelle: pass.eleve.classeActuelle?.libelle }, matricule: pass.eleve.matricule })}
        ${tableauKV([
          ['Date et heure', `${dateFr(pass.datePassage)} — ${new Date(pass.datePassage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`],
          ['Motif', echapper(pass.motif)],
          ['Symptômes', echapper(pass.symptomes || '—')],
          ['Température', pass.temperature ? `${pass.temperature} °C` : '—'],
          ['Soins administrés', echapper(pass.soinsAdministres || '—')],
          ['Issue', `<b>${echapper(pass.issue)}</b>`],
          ['Parents notifiés', pass.parentsNotifies ? `<span style="color:#047857">OUI — notifiés le jour même</span>` : 'non'],
          ['Commentaire', echapper(pass.commentaire || '—')],
        ])}
        ${zoneSignature(c.identite, { qui: 'L\'Infirmier(ère)' })}`,
      };
    },
  },
  {
    code: 'declaration_accident', libelle: 'Déclaration d\'accident scolaire', domaine: 'Santé & bien-être',
    description: 'Déclaration officielle circonstanciée d\'un accident.',
    entete: 'majeur', confidential: true, permission: 'sante.gerer',
    parametres: [P.eleve(), P.date('date', 'Date de l\'accident'), P.texte('heure', 'Heure'), P.texte('lieu', 'Lieu précis'), P.textarea('circonstances', 'Circonstances détaillées (chronologie des faits)'), P.textarea('lesions', 'Lésions constatées'), P.texte('secours', 'Mesures de secours prises')],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Déclaration d\'accident scolaire',
        sousTitre: 'Document circonstancié établi le jour même',
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, dateNaissance: el.dateNaissance, classe: { libelle: el.classeActuelle?.libelle }, matricule: el.matricule, lignes: parentsLignes(el) })}
        ${tableauKV([
          ['Date et heure de l\'accident', `${dateFr(c.p.date)} à ${echapper(c.p.heure)}`],
          ['Lieu précis', echapper(c.p.lieu)],
        ], 'A — Circonstances')}
        <div class="cadre" style="text-align:justify;min-height:80px">${echapper(c.p.circonstances)}</div>
        ${tableauKV([
          ['Lésions constatées', echapper(c.p.lesions)],
          ['Mesures de secours', echapper(c.p.secours)],
          ['Parents informés', '☐ immédiatement ☐ en fin de journée — heure : ______'],
          ['Évacuation', '☐ aucune ☐ domicile ☐ centre médical ☐ hôpital'],
        ], 'B — Constats et secours')}
        <div class="section-titre">C — Prévention</div>
        <p style="font-size:10.4pt">Mesures correctrices envisagées : <span class="points" style="min-width:340px"></span></p>
        ${doubleSignature(c.identite, { qui: 'Le Témoin / Déclarant' }, { qui: 'L\'Infirmier(ère)' })}
        ${zoneSignature(c.identite, { qui: 'Le Chef d\'Établissement (visa)' })}`,
      };
    },
  },
  {
    code: 'protocole_urgence', libelle: 'Protocole d\'urgence individuel', domaine: 'Santé & bien-être',
    description: 'Conduite à tenir pour une pathologie donnée (PAI).',
    entete: 'majeur', confidential: true, permission: 'sante.gerer',
    parametres: [P.eleve(), P.texte('pathologie', 'Pathologie (asthme, diabète, allergie…)'), P.textarea('signes', 'Signes d\'alerte (un par ligne)'), P.textarea('gestes', 'GESTES À FAIRE (un par ligne)'), P.textarea('interdits', 'À NE PAS FAIRE (un par ligne)'), P.texte('medicament', 'Médicament d\'urgence + lieu de stockage', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const liste = (s: string) => s.split('\n').filter(Boolean).map((l) => `<li>${echapper(l.trim())}</li>`).join('');
      return {
        titre: 'Protocole d\'urgence individuel',
        sousTitre: echapper(c.p.pathologie),
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle }, lignes: parentsLignes(el) })}
        <div class="section-titre">Signes d'alerte</div>
        <ul style="font-size:10.4pt;line-height:1.8;margin-left:20px">${liste(c.p.signes)}</ul>
        <div class="cadre" style="background:#f0fdf4"><div class="section-titre" style="margin-top:0">✅ Geste à faire immédiatement</div>
        <ul style="font-size:10.6pt;line-height:1.8;margin-left:20px;font-weight:600">${liste(c.p.gestes)}</ul></div>
        <div class="cadre-rouge"><b>⛔ À ne PAS faire</b>
        <ul style="font-size:10.4pt;line-height:1.8;margin-left:20px">${liste(c.p.interdits)}</ul></div>
        ${c.p.medicament ? tableauKV([['Médicament d\'urgence', echapper(c.p.medicament)]]) : ''}
        ${mention('Protocole établi avec l\'accord de la famille — affiché en infirmerie et remis au professeur principal en version anonymisée.')}
        ${doubleSignature(c.identite, { qui: 'Le Responsable légal (accord)' }, { qui: 'L\'Infirmier(ère)' })}`,
      };
    },
  },
  {
    code: 'autorisation_medicament', libelle: 'Autorisation d\'administration de médicament', domaine: 'Santé & bien-être',
    description: 'Passeport médicament pour la journée.',
    entete: 'majeur', permission: 'sante.gerer',
    parametres: [P.eleve(), P.texte('medicament', 'Médicament'), P.texte('posologie', 'Posologie (ex : 1 comprimé de 500 mg)'), P.texte('horaires', 'Horaires de prise'), P.date('debut', 'Du'), P.date('fin', 'Au'), P.textarea('observations', 'Observations', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Autorisation d\'administration de médicament',
        corps: trameNotification({
          titre: 'Autorisation d\'administration de médicament',
          objet: `${echapper(c.p.medicament)} — ${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}`,
          corpsHtml: `Je soussigné(e), responsable légal de <b>${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</b>, élève en classe de ${echapper(el.classeActuelle?.libelle || '—')}, autorise l'infirmerie de l'établissement à administrer le traitement suivant :`,
          tableauDecisions: [
            ['Médicament', echapper(c.p.medicament)], ['Posologie', echapper(c.p.posologie)],
            ['Horaires', echapper(c.p.horaires)], ['Période', `du ${dateFr(c.p.debut)} au ${dateFr(c.p.fin)}`],
            ['Observations', echapper(c.p.observations || 'aucune')],
          ],
        }) + `
        <div class="mention-legale">Les médicaments sont remis DANS LEUR BOÎTE D'ORIGINE à l'infirmerie, avec la notice. Toute modification du traitement nécessite une nouvelle autorisation écrite.</div>
        ${doubleSignature(c.identite, { qui: 'Le Responsable légal' }, { qui: 'L\'Infirmier(ère) (réception du traitement)' })}`,
      };
    },
  },
];

// ====================================================================
// DOMAINE 6 — COMMUNICATION & ÉVÉNEMENTS
// ====================================================================

const docsCommunication: ModeleDoc[] = [
  {
    code: 'invitation_ceremonie', libelle: 'Invitation à une cérémonie', domaine: 'Communication & événements',
    description: 'Invitation officielle (remise de diplômes, rentrée…).',
    entete: 'majeur', permission: 'communication.envoyer',
    parametres: [P.texte('motif', 'Motif de la cérémonie'), P.date('date', 'Date'), P.texte('heure', 'Heure'), P.texte('lieu', 'Lieu'), P.texte('invite', 'Nom de l\'invité'), P.textarea('programme', 'Programme (une ligne par séquence)', false), P.texte('rsvp', 'Contact RSVP + date limite', '', false)],
    generer: async (c) => ({
      titre: 'Invitation',
      sousTitre: echapper(c.p.motif),
      corps: `
      <div style="text-align:center;margin:22px 0">
        <div style="font-family:Georgia,serif;font-size:19pt;font-weight:700;color:${c.identite.couleur}">L'établissement ${echapper(c.identite.nom)}</div>
        <div style="font-size:10.6pt;color:#555;margin:8px 0 20px">a l'honneur d'inviter</div>
        <div style="font-family:Georgia,serif;font-size:17pt;font-weight:700">${echapper(c.p.invite)}</div>
        <div style="font-size:10.6pt;margin:14px 0">à la cérémonie de <b>${echapper(c.p.motif)}</b></div>
      </div>
      <div class="total-encadre" style="justify-content:center;gap:40px">
        <span>${dateFr(c.p.date)}</span><span>${echapper(c.p.heure)}</span><span>${echapper(c.p.lieu)}</span>
      </div>
      ${c.p.programme ? `<div class="section-titre">Programme</div><ol style="font-size:10.4pt;line-height:1.9;margin-left:22px">${c.p.programme.split('\n').filter(Boolean).map((l) => `<li>${echapper(l.trim())}</li>`).join('')}</ol>` : ''}
      ${c.p.rsvp ? `<div class="cadre" style="text-align:center">Réponse attendue : ${echapper(c.p.rsvp)}</div>` : ''}
      ${zoneSignature(c.identite)}`,
    }),
  },
  {
    code: 'convocation_reunion_parents', libelle: 'Convocation réunion parents-professeurs', domaine: 'Communication & événements',
    description: 'Convocation avec créneaux réservés par famille.',
    entete: 'mineur', permission: 'communication.envoyer',
    parametres: [P.classe(false), P.texte('famille', 'Famille (nom)'), P.texte('eleve', 'Élève concerné', '', false), P.date('date', 'Date'), P.texte('heure', 'Heure'), P.texte('salle', 'Salle')],
    generer: async (c) => ({
      titre: '',
      corps: trameConvocation({
  identite: c.identite,
        destinataireHtml: `<b>Famille ${echapper(String(c.p.famille).toUpperCase())}</b>${c.p.eleve ? `<div style="font-size:9.6pt;color:#555">parent(s) de ${echapper(c.p.eleve)}${c.p.classeId ? ' — ' + echapper((await db.classe.findFirst({ where: { id: c.p.classeId } }))?.libelle || '') : ''}</div>` : ''}`,
        motif: 'Réunion parents-professeurs — rencontre avec l\'équipe pédagogique',
        dateHeure: `${dateFr(c.p.date)} à ${echapper(c.p.heure)}`,
        lieu: c.p.salle,
        ordreDuJour: ['Rencontre avec le professeur principal', 'Entretiens individuels avec les enseignants', 'Remise du bulletin trimestriel'],
        obligatoire: false,
        signataire: 'La Direction',
      }) + zoneSignature(c.identite),
    }),
  },
  {
    code: 'compte_rendu_reunion', libelle: 'Compte rendu de réunion', domaine: 'Communication & événements',
    description: 'CR avec décisions/responsables/échéances.',
    entete: 'mineur', permission: 'communication.envoyer',
    parametres: [P.texte('objet', 'Objet de la réunion'), P.date('date', 'Date'), P.textarea('participants', 'Participants (un par ligne)'), P.textarea('deliberations', 'Délibérations (une par ligne)'), P.textarea('decisions', 'Décisions (format : décision | responsable | échéance)')],
    generer: async (c) => ({
      titre: 'Compte rendu de réunion',
      corps: `
      ${tableauKV([['Objet', echapper(c.p.objet)], ['Date', dateFr(c.p.date)]])}
      <div class="section-titre">Participants</div>
      <ul style="font-size:10.4pt;line-height:1.8;margin-left:20px">${c.p.participants.split('\n').filter(Boolean).map((l) => `<li>${echapper(l.trim())}</li>`).join('')}</ul>
      <div class="section-titre">Délibérations</div>
      <ol style="font-size:10.4pt;line-height:1.8;margin-left:22px">${c.p.deliberations.split('\n').filter(Boolean).map((l) => `<li>${echapper(l.trim())}</li>`).join('')}</ol>
      <div class="section-titre">Décisions</div>
      <table class="data"><thead><tr><th>Décision</th><th style="width:22%">Responsable</th><th style="width:16%">Échéance</th></tr></thead>
      <tbody>${c.p.decisions.split('\n').filter(Boolean).map((l) => { const [d, r, e] = l.split('|'); return `<tr><td>${echapper((d || '').trim())}</td><td>${echapper((r || '').trim())}</td><td>${echapper((e || '').trim())}</td></tr>`; }).join('')}</tbody></table>
      ${zoneSignature(c.identite, { qui: 'Le Secrétaire de séance' })}`,
    }),
  },
  {
    code: 'lettre_felicitations', libelle: 'Lettre de félicitations', domaine: 'Communication & événements',
    description: 'Félicitations officielles à l\'élève et à sa famille.',
    entete: 'mineur', permission: 'bulletins.valider',
    parametres: [P.eleve(), P.texte('motif', 'Motif (moyenne ≥ 15, progrès…)'), P.texte('signature', 'Signataire', 'Ex : Le Professeur principal', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: '',
        corps: `
        <div style="text-align:center;font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:2px 0 12px;color:${c.identite.couleur}">Félicitations</div>
        <p style="font-size:10.8pt">À l'attention de la famille de <b>${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</b>, élève en classe de ${echapper(el.classeActuelle?.libelle || '—')}.</p>
        <p style="font-size:10.8pt;text-align:justify;margin-top:12px">Nous avons le plaisir de vous informer que votre enfant s'est particulièrement distingué(e) : <b>${echapper(c.p.motif)}</b>. Le conseil des professeurs tient à saluer ce résultat, fruit d'un travail sérieux et régulier.</p>
        <p style="font-size:10.8pt;text-align:justify">Nous vous encourageons à poursuivre cet excellent engagement, et vous prions de recevoir nos sincères félicitations, ainsi que l'expression de notre entière confiance pour la suite de l'année.</p>
        ${zoneSignature(c.identite, { qui: c.p.signature || 'Le Professeur principal' })}`,
      };
    },
  },
  {
    code: 'lettre_accompagnement', libelle: 'Lettre d\'accompagnement (élève en difficulté)', domaine: 'Communication & événements',
    description: 'Bilan et plan d\'aide — ton constructif.',
    entete: 'mineur', permission: 'bulletins.valider',
    parametres: [P.eleve(), P.texte('bilan', 'Bilan chiffré sobre (moyennes)'), P.textarea('plan', 'Plan d\'aide proposé (un point par ligne)')],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: '',
        corps: `
        <p style="font-size:10.8pt">À l'attention de la famille de <b>${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</b> — classe de ${echapper(el.classeActuelle?.libelle || '—')}.</p>
        <p style="font-size:10.8pt;text-align:justify;margin-top:12px"><b>Objet : accompagnement pédagogique de votre enfant.</b></p>
        <p style="font-size:10.8pt;text-align:justify">L'équipe pédagogique a procédé à l'analyse des résultats de la période : ${echapper(c.p.bilan)}. Ces résultats appellent un accompagnement renforcé, que nous souhaitons construire <b>avec vous</b>. Voici les mesures que nous proposons :</p>
        <ul style="font-size:10.4pt;line-height:1.8;margin-left:20px">${c.p.plan.split('\n').filter(Boolean).map((l) => `<li>${echapper(l.trim())}</li>`).join('')}</ul>
        <div class="cadre">Nous vous invitons à un entretien afin d'ajuster ensemble ce plan d'aide. Merci de contacter le professeur principal au ${echapper(c.identite.telephone || 'secrétariat')}.</div>
        <p style="font-size:10.8pt;text-align:justify">Soyez assurés de notre engagement : ces difficultés ponctuelles, prises à temps, se surmontent.</p>
        ${zoneSignature(c.identite, { qui: 'Le Professeur principal et la Direction' })}`,
      };
    },
  },
  {
    code: 'newsletter', libelle: 'Newsletter de l\'établissement', domaine: 'Communication & événements',
    description: 'Lettre d\'information trimestrielle.',
    entete: 'majeur', permission: 'communication.envoyer',
    parametres: [P.texte('numero', 'Numéro', 'Ex : N° 4'), P.texte('une', 'Article « à la une » (titre | texte)'), P.textarea('reussites', 'Réussites à souligner (une par ligne)', false), P.textarea('agenda', 'Agenda à venir (date | événement)')],
    generer: async (c) => {
      const [titreUne, texteUne] = c.p.une.split('|');
      return {
        titre: `La lettre de l'établissement — ${echapper(c.p.numero)}`,
        sousTitre: `Année ${echapper(c.identite.anneeScolaire)}`,
        corps: `
        <div class="cadre" style="background:${c.identite.couleur}10;padding:14px 18px">
          <div style="font-family:Georgia,serif;font-size:15pt;font-weight:700;color:${c.identite.couleur}">${echapper((titreUne || '').trim())}</div>
          <p style="font-size:10.6pt;text-align:justify;margin-top:6px">${echapper((texteUne || '').trim())}</p>
        </div>
        ${c.p.reussites ? `<div class="section-titre">Ils nous ont fait honneur</div><ul style="font-size:10.4pt;line-height:1.8;margin-left:20px">${c.p.reussites.split('\n').filter(Boolean).map((l) => `<li>★ ${echapper(l.trim())}</li>`).join('')}</ul>` : ''}
        <div class="section-titre">Agenda</div>
        <table class="data"><thead><tr><th style="width:26%">Date</th><th>Événement</th></tr></thead>
        <tbody>${c.p.agenda.split('\n').filter(Boolean).map((l) => { const [d, e] = l.split('|'); return `<tr><td><b>${echapper((d || '').trim())}</b></td><td>${echapper((e || '').trim())}</td></tr>`; }).join('')}</tbody></table>
        <div style="text-align:center;font-size:10pt;font-style:italic;margin-top:14px">Toute l'équipe de ${echapper(c.identite.nom)} vous souhaite une excellente fin de période.</div>`,
      };
    },
  },
  {
    code: 'affiche_evenement', libelle: 'Affiche d\'événement', domaine: 'Communication & événements',
    description: 'Affiche A3 : 5 infos clés.',
    entete: 'majeur', permission: 'communication.envoyer',
    parametres: [P.texte('titre', 'Titre de l\'événement'), P.texte('accroche', 'Phrase d\'accroche'), P.date('date', 'Date'), P.texte('heure', 'Heure'), P.texte('lieu', 'Lieu'), P.texte('contact', 'Contact / inscription')],
    generer: async (c) => ({
      titre: '',
      corps: `
      <div style="text-align:center;padding:30px 10px">
        <div style="font-size:11pt;letter-spacing:4px;text-transform:uppercase;color:${c.identite.couleur}">${echapper(c.identite.nom)} présente</div>
        <div style="font-family:Georgia,serif;font-size:30pt;font-weight:800;margin:22px 0 10px;line-height:1.15">${echapper(c.p.titre)}</div>
        <div style="font-size:13pt;font-style:italic;color:#444">${echapper(c.p.accroche)}</div>
        <div style="display:flex;justify-content:center;gap:30px;margin:30px 0;flex-wrap:wrap">
          ${[[ '📅 Quand', `${dateFr(c.p.date)} · ${c.p.heure}` ], ['📍 Où', c.p.lieu], ['✍️ Inscription', c.p.contact]].map(([k, v]) => `
          <div style="border:2px solid ${c.identite.couleur};border-radius:10px;padding:12px 20px;min-width:160px">
            <div style="font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:${c.identite.couleur}">${echapper(k)}</div>
            <div style="font-weight:700;margin-top:4px">${echapper(v)}</div>
          </div>`).join('')}
        </div>
        <div style="font-size:10pt;color:#666">Entrée ${'gratuite' === 'gratuite' ? 'libre' : ''} dans la limite des places disponibles</div>
      </div>`,
    }),
  },
];

// ====================================================================
// DOMAINE 7 — ADMISSIONS & EXAMENS
// ====================================================================

const docsAdmissions: ModeleDoc[] = [
  {
    code: 'confirmation_admission', libelle: 'Confirmation d\'admission', domaine: 'Admissions & examens',
    description: 'Admission officielle + pièces à fournir + conditions.',
    entete: 'majeur', permission: 'eleves.ecrire',
    parametres: [{ cle: 'candidatureId', libelle: 'Candidature', type: 'candidature', requis: true }, P.texte('classe', 'Classe attribuée'), P.date('echeance', 'Date limite de confirmation')],
    generer: async (c) => {
      const cand = await (db as any).candidatureAdmission.findFirst({ where: { id: c.p.candidatureId, ecoleId: c.identite.ecoleId } });
      if (!cand) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
      return {
        titre: 'Confirmation d\'admission',
        sousTitre: `Année ${echapper(c.identite.anneeScolaire)}`,
        corps: trameNotification({
          titre: 'Confirmation d\'admission',
          objet: `Admission de ${echapper(cand.prenom)} ${echapper(String(cand.nom).toUpperCase())}`,
          corpsHtml: `Nous avons le plaisir de vous informer que votre enfant <b>${echapper(cand.prenom)} ${echapper(String(cand.nom).toUpperCase())}</b>, né(e) le ${dateFr(cand.dateNaissance)}, est <b>admis(e)</b> à l'établissement ${echapper(c.identite.nom)}, en classe de <b>${echapper(c.p.classe)}</b>, pour l'année scolaire ${echapper(c.identite.anneeScolaire)}.<br/><br/>Cette admission devient définitive après remise du dossier complet et règlement des frais d'inscription.`,
          tableauDecisions: [
            ['Classe attribuée', echapper(c.p.classe)],
            ['Date limite de confirmation', `<b>${dateFr(c.p.echeance)}</b>`],
            ['Responsable à contacter', echapper(cand.parentNom || '—')],
          ],
        }) + `
        <div class="section-titre">Pièces à fournir</div>
        <ol style="font-size:10.4pt;line-height:1.9;margin-left:22px">
          <li>Extrait d'acte de naissance (copie)</li><li>4 photos d'identité récentes</li>
          <li>Carnet de vaccination à jour</li><li>Certificat de radiation de l'établissement précédent</li>
          <li>Bulletins de l'année précédente</li><li>Copie de la pièce d'identité du responsable légal</li>
        </ol>
        <div class="cadre-rouge">La place n'est garantie qu'après règlement des frais d'inscription au plus tard le ${dateFr(c.p.echeance)}.</div>
        ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'convocation_test', libelle: 'Convocation à un test d\'admission', domaine: 'Admissions & examens',
    description: 'Convocation au test d\'entrée.',
    entete: 'mineur', permission: 'eleves.ecrire',
    parametres: [{ cle: 'candidatureId', libelle: 'Candidature', type: 'candidature', requis: true }, P.date('date', 'Date du test'), P.texte('heure', 'Heure (présenter 15 min avant)'), P.texte('salle', 'Salle'), P.texte('duree', 'Durée', 'Ex : 2 h')],
    generer: async (c) => {
      const cand = await (db as any).candidatureAdmission.findFirst({ where: { id: c.p.candidatureId, ecoleId: c.identite.ecoleId } });
      if (!cand) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
      return {
        titre: '',
        corps: trameConvocation({
  identite: c.identite,
          destinataireHtml: `<b>Candidat(e) : ${echapper(cand.prenom)} ${echapper(String(cand.nom).toUpperCase())}</b><div style="font-size:9.6pt;color:#555">Candidature enregistrée le ${dateCourte(cand.dateSoumission)}</div>`,
          motif: 'Test d\'admission à l\'établissement',
          dateHeure: `${dateFr(c.p.date)} à ${echapper(c.p.heure)} (durée : ${echapper(c.p.duree)})`,
          lieu: c.p.salle,
          ordreDuJour: ['Épreuve de français', 'Épreuve de mathématiques', 'Entretien éventuel avec la direction'],
          obligatoire: true,
          signataire: 'La Direction',
        }) + `
        <div class="cadre">Matériel obligatoire : stylos, crayon, règle, calculatrice autorisée si niveau applicable. Pièce d'identité exigée à l'entrée.</div>
        <div class="cadre-rouge">Toute absence non justifiée avant l'épreuve vaut renoncement à la candidature.</div>
        ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'notification_resultat_admission', libelle: 'Notification de résultat d\'admission', domaine: 'Admissions & examens',
    description: 'Admis / liste d\'attente / non retenu.',
    entete: 'majeur', permission: 'eleves.ecrire',
    parametres: [{ cle: 'candidatureId', libelle: 'Candidature', type: 'candidature', requis: true }, { cle: 'resultat', libelle: 'Résultat', type: 'select', requis: true, options: [{ valeur: 'admis', libelle: 'Admis(e)' }, { valeur: 'attente', libelle: 'Liste d\'attente' }, { valeur: 'refuse', libelle: 'Non retenu(e)' }] }],
    generer: async (c) => {
      const cand = await (db as any).candidatureAdmission.findFirst({ where: { id: c.p.candidatureId, ecoleId: c.identite.ecoleId } });
      if (!cand) throw new ActionError('Candidature introuvable.', 'INTROUVABLE');
      const message = {
        admis: `Nous avons le plaisir de vous informer que votre enfant est <b>ADMIS(E)</b> à l'établissement. Vous recevrez prochainement la confirmation d'admission détaillant les pièces à fournir.`,
        attente: `Votre enfant est placé(e) sur <b>liste d'attente</b>. Toute place qui se libérerait vous serait proposée par téléphone, dans l'ordre de la liste.`,
        refuse: `Après examen de l'ensemble des candidatures, nous ne sommes pas en mesure de retenir celle de votre enfant pour cette session. Ce décision, liée au nombre de places disponibles, ne préjuge en rien de ses capacités. Nous vous souhaitons une excellente scolarité dans l'établissement de votre choix.`,
      }[c.p.resultat] || '';
      return {
        titre: 'Notification de résultat d\'admission',
        sousTitre: `Session ${echapper(c.identite.anneeScolaire)}`,
        corps: trameNotification({
          titre: 'Notification de résultat',
          objet: `Candidature de ${echapper(cand.prenom)} ${echapper(String(cand.nom).toUpperCase())}`,
          corpsHtml: `Madame, Monsieur,<br/><br/>${message}`,
          tableauDecisions: [['Candidat(e)', `${echapper(cand.prenom)} ${echapper(String(cand.nom).toUpperCase())}`], ['Date de décision', dateFr(cand.dateDecision || new Date())], ['Résultat', `<b>${{ admis: 'ADMIS(E)', attente: 'LISTE D\'ATTENTE', refuse: 'NON RETENU(E)' }[c.p.resultat] || '—'}</b>`]],
        }) + zoneSignature(c.identite),
      };
    },
  },
  {
    code: 'convocation_examen', libelle: 'Convocation aux examens officiels', domaine: 'Admissions & examens',
    description: 'Convocation officielle : n° table, salle, règlement.',
    entete: 'majeur', permission: 'examens.gerer',
    parametres: [P.eleve(), P.texte('examen', 'Examen (ex : BFEM 2027 session normale)'), P.texte('numTable', 'Numéro de table'), P.texte('salle', 'Salle / centre'), P.date('debut', 'Date de début'), P.texte('horaires', 'Horaires des épreuves'), P.texte('materiel', 'Matériel obligatoire', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Convocation aux examens officiels',
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, dateNaissance: el.dateNaissance, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } })}
        <div class="cadre" style="display:flex;justify-content:space-around;text-align:center">
          <div><div style="font-size:8.6pt;text-transform:uppercase;letter-spacing:1px;color:#555">Examen</div><b>${echapper(c.p.examen)}</b></div>
          <div><div style="font-size:8.6pt;text-transform:uppercase;letter-spacing:1px;color:#555">N° de table</div><b style="font-size:14pt">${echapper(c.p.numTable)}</b></div>
          <div><div style="font-size:8.6pt;text-transform:uppercase;letter-spacing:1px;color:#555">Salle / centre</div><b>${echapper(c.p.salle)}</b></div>
        </div>
        ${tableauKV([['Début des épreuves', dateFr(c.p.debut)], ['Horaires', echapper(c.p.horaires)], ['Matériel', echapper(c.p.materiel || 'stylos verts/noirs, pièce d\'identité, convocation')]])}
        <div class="cadre-rouge"><b>Règlement de l'examen</b> — Tout retard de plus de 15 minutes exclut définitivement de l'épreuve. La fraude ou tentative de fraude entraîne l'exclusion de la session entière. Les téléphones et objets connectés sont interdits dans les salles.</div>
        ${zoneSignature(c.identite, { qui: 'Le Chef de Centre d\'examen' })}`,
      };
    },
  },
  {
    code: 'certificat_reussite', libelle: 'Certificat de réussite (examen interne)', domaine: 'Admissions & examens',
    description: 'Certificat de réussite avec jury.',
    entete: 'majeur', permission: 'examens.gerer',
    parametres: [P.eleve(), P.texte('examen', 'Examen'), P.texte('note', 'Note / mention obtenue'), P.texte('jury', 'Composition du jury (noms séparés par des virgules)', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Certificat de réussite',
        corps: `
        <div style="text-align:center;margin:24px 0">
          <div style="font-family:Georgia,serif;font-size:12.5pt;text-transform:uppercase;letter-spacing:2px">L'établissement ${echapper(c.identite.nom)}</div>
          <div style="font-size:10pt;color:#555;margin:6px 0 20px">certifie que</div>
          <div style="font-family:Georgia,serif;font-size:20pt;font-weight:700">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
          <div style="font-size:10.6pt;margin:14px 0">né(e) le ${dateFr(el.dateNaissance)}, a réussi l'examen : <b>${echapper(c.p.examen)}</b></div>
          <div style="margin:16px 0;font-size:12.5pt">avec la mention : <b>${echapper(c.p.note)}</b></div>
          ${c.p.jury ? `<div style="font-size:9.6pt;color:#555">Jury : ${echapper(c.p.jury)}</div>` : ''}
        </div>
        ${doubleSignature(c.identite, { qui: 'Le Président du jury' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
  {
    code: 'attestation_rib', libelle: 'Attestation RIB de l\'établissement', domaine: 'Admissions & examens',
    description: 'Coordonnées bancaires officielles — avec alerte anti-fraude.',
    entete: 'majeur', permission: 'finances.voir',
    parametres: [P.texte('banque', 'Banque'), P.texte('rib', 'RIB / IBAN'), P.texte('titulaire', 'Titulaire du compte', '', false)],
    generer: async (c) => ({
      titre: 'Attestation d\'identité bancaire (RIB)',
      corps: `
      ${trameAttestation({
        titre: 'Relevé d\'identité bancaire de l\'établissement',
        intro: `Les paiements destinés à l'établissement <b>${echapper(c.identite.nom)}</b> doivent être effectués exclusivement sur le compte suivant :`,
        blocsHtml: tableauKV([
          ['Titulaire du compte', echapper(c.p.titulaire || c.identite.nom)],
          ['Banque', echapper(c.p.banque)],
          ['RIB / IBAN', `<b style="font-family:monospace;font-size:12pt;letter-spacing:1px">${echapper(c.p.rib)}</b>`],
        ]),
        finale: 'Toute autre coordonnée que celle figurant sur la présente attestation doit être signalée immédiatement à l\'établissement.',
      })}
      <div class="cadre-rouge" style="font-size:10.4pt"><b>⚠️ Alerte anti-fraude :</b> vérifiez ces coordonnées par téléphone au ${echapper(c.identite.telephone || '—')} avant tout virement. L'établissement ne modifie JAMAIS son RIB à la suite d'un simple email ou SMS.</div>
      ${zoneSignature(c.identite, { qui: 'Le Service Comptabilité' })}`,
    }),
  },
];

// ====================================================================
// DOMAINE 8 — SERVICES (cantine, transport, garderie)
// ====================================================================

const docsServices: ModeleDoc[] = [
  {
    code: 'inscription_cantine', libelle: 'Fiche d\'inscription cantine', domaine: 'Services',
    description: 'Inscription avec jours de présence et alerte allergènes.',
    entete: 'majeur', permission: 'services.gerer',
    parametres: [P.eleve(), P.texte('jours', 'Jours de présence (ex : Lundi,Mardi,Jeudi,Vendri)'), P.texte('tarif', 'Tarif journalier (F)', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const jours = c.p.jours.split(',').map((j) => j.trim()).filter(Boolean);
      const tarif = Number((c.p.tarif || '0').replace(/\s/g, '')) * 100;
      const fiche = await db.ficheSante.findFirst({ where: { eleveId: el.id } });
      const allergies = fiche?.allergies && !fiche.allergies.toLowerCase().includes('aucune') ? fiche.allergies : null;
      return {
        titre: 'Fiche d\'inscription à la cantine',
        sousTitre: `Année ${echapper(c.identite.anneeScolaire)}`,
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle }, matricule: el.matricule, lignes: parentsLignes(el) })}
        ${allergies ? `<div class="cadre-rouge"><b>⚠️ ALLERGIES À SIGNALER AU SERVICE :</b> ${echapper(allergies)}. Le service de restauration en est informé; les plats concernés seront signalés quotidiennement sur les menus.</div>` : ''}
        ${tableauKV([
          ['Régime', echapper(el.regime || 'demi-pensionnaire')],
          ['Jours de présence', jours.join(' · ')],
          ['Tarif journalier', tarif ? formatXOF(tarif) : 'selon grille en vigueur'],
          ['Coût mensuel estimé', tarif ? formatXOF(Math.round(tarif * jours.length * 4.33)) : '—'],
        ])}
        ${mention('La facturation est établie en début de mois suivant, sur la base des jours souscrits. Toute modification se fait par écrit avant le 25 du mois.')}
        ${doubleSignature(c.identite, { qui: 'Le Responsable légal' }, { qui: 'La Direction' })}`,
      };
    },
  },
  {
    code: 'menu_cantine', libelle: 'Menu hebdomadaire cantine', domaine: 'Services',
    description: 'Menus de la semaine avec allergènes en évidence.',
    entete: 'majeur', permission: 'services.gerer',
    parametres: [{ cle: 'semaine', libelle: 'Semaine du (lundi, AAAA-MM-JJ)', type: 'texte', requis: false }],
    generer: async (c) => {
      const debut = c.p.semaine ? new Date(c.p.semaine + 'T00:00:00') : new Date();
      const fin = new Date(debut.getTime() + 5 * 86400000);
      const menus = await db.cantineMenu.findMany({
        where: { ecoleId: c.identite.ecoleId, date: { gte: debut, lte: fin } },
        orderBy: { date: 'asc' },
      });
      if (!menus.length) throw new ActionError('Aucun menu enregistré pour cette semaine (saisissez-les dans Services → Cantine).', 'VIDE');
      const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      return {
        titre: 'Menu de la semaine',
        sousTitre: `Semaine du ${dateFr(debut)} au ${dateFr(fin)}`,
        corps: `
        <table class="data"><thead><tr><th style="width:16%">Jour</th><th>Plat principal</th><th>Accompagnement</th><th>Dessert</th><th style="width:18%">Allergènes</th></tr></thead>
        <tbody>${menus.map((m: any) => `<tr><td><b>${jours[(new Date(m.date).getDay() + 6) % 7]}</b><div style="font-size:8.6pt;color:#888">${dateCourte(m.date)}</div></td><td>${echapper(m.platPrincipal)}</td><td>${echapper(m.accompagnement || '—')}</td><td>${echapper(m.dessert || '—')}</td><td>${m.allergenes ? `<b style="color:#b91c1c">${echapper(m.allergenes)}</b>` : '—'}</td></tr>`).join('')}</tbody></table>
        ${mention('Menus susceptibles de modification selon les approvisionnements. Les allergènes majeurs sont signalés en rouge : les familles concernées doivent consulter le service chaque matin.')}`,
      };
    },
  },
  {
    code: 'carte_transport', libelle: 'Carte de transport', domaine: 'Services',
    description: 'Carte nominative avec arrêts et QR de contrôle.',
    entete: 'majeur', permission: 'services.gerer',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const insc = await db.transportInscription.findFirst({
        where: { eleveId: el.id, actif: true },
        include: { ligne: { include: { arrets: true } } },
      });
      if (!insc) throw new ActionError('Cet élève n\'est pas inscrit au transport (inscrivez-le dans Services → Transport).', 'NON_INSCRIT');
      const arrets = ((insc.ligne as any)?.arrets ?? []).map((a: any) => `${a.heurePassage || ''} ${a.nom || a.libelle || ''}`.trim()).filter(Boolean);
      return {
        titre: '',
        corps: `
        <div style="display:flex;justify-content:center">
        <div style="width:430px;border:2.5px solid ${c.identite.couleur};border-radius:14px;overflow:hidden">
          <div style="background:${c.identite.couleur};color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:800;letter-spacing:2px">CARTE DE TRANSPORT</div>
            <div style="font-size:9pt">${echapper(c.identite.nom)}</div>
          </div>
          <div style="padding:14px 16px;display:flex;gap:14px">
            <div style="width:74px;height:88px;border:1.5px dashed #aaa;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:8pt;text-align:center">Photo<br/>élève</div>
            <div style="flex:1">
              <div style="font-size:15pt;font-weight:800">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
              <div style="font-size:10pt;color:#444;margin-top:3px">${echapper(el.classeActuelle?.libelle || '')} · Matricule ${echapper(el.matricule || '—')}</div>
              <div style="margin-top:9px;font-size:10.6pt"><b>Ligne :</b> ${echapper((insc.ligne as any)?.nom || '—')}</div>
              <div style="font-size:10.6pt"><b>Arrêts :</b> ${arrets.slice(0, 4).join(' → ') || '—'}</div>
              <div style="font-size:10.6pt"><b>Validité :</b> année ${echapper(c.identite.anneeScolaire)}</div>
            </div>
          </div>
          <div style="background:#f4f8f7;padding:8px 16px;font-size:8.6pt;color:#444;display:flex;justify-content:space-between">
            <div><b>Carte strictement nominative et non transférable.</b><br/>À présenter à chaque montée. Perte : ${formatXOF(200000)}.</div>
            <div style="text-align:right">Contrôle : ${echapper(c.identite.telephone || '')}</div>
          </div>
        </div>
        </div>`,
      };
    },
  },
  {
    code: 'planning_garderie', libelle: 'Planning de garderie', domaine: 'Services',
    description: 'Inscriptions et horaires de la garderie.',
    entete: 'majeur', permission: 'services.gerer',
    parametres: [{ cle: 'semaine', libelle: 'Semaine du (lundi, AAAA-MM-JJ)', type: 'texte', requis: false }],
    generer: async (c) => {
      const debut = c.p.semaine ? new Date(c.p.semaine + 'T00:00:00') : new Date();
      const fin = new Date(debut.getTime() + 5 * 86400000);
      const sessions = await (db as any).garderieSession.findMany({
        where: { date: { gte: debut, lte: fin } },
        include: { eleve: { include: { classeActuelle: true } } },
        orderBy: ['date', 'heureArrivee'],
      }).catch(() => []);
      return {
        titre: 'Planning de garderie',
        sousTitre: `Semaine du ${dateFr(debut)}`,
        corps: `
        <table class="data"><thead><tr><th style="width:16%">Jour</th><th>Enfant</th><th>Classe</th><th style="width:20%">Horaires</th><th style="width:18%">Coût</th></tr></thead>
        <tbody>${(sessions ?? []).map((s: any) => `<tr><td><b>${dateCourte(s.date)}</b></td><td>${echapper(s.eleve?.prenom)} ${echapper(String(s.eleve?.nom || '').toUpperCase())}</td><td>${echapper(s.eleve?.classeActuelle?.libelle || '—')}</td><td>${echapper(s.heureArrivee || '—')} → ${echapper(s.heureDepart || '—')}</td><td style="text-align:right">${s.cout ? formatXOF(s.cout) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#999">Aucune inscription cette semaine</td></tr>'}</tbody></table>
        ${mention('La garderie est facturée à la minute au-delà du forfait. Les retards répétés font l\'objet d\'un courrier de la direction.')}`,
      };
    },
  },
  {
    code: 'facture_services', libelle: 'Facture de services (cantine/transport/garderie)', domaine: 'Services',
    description: 'Facture détaillée des services annexes.',
    entete: 'financier', permission: 'finances.voir',
    parametres: [P.eleve(), { cle: 'type', libelle: 'Service', type: 'select', requis: true, options: [{ valeur: 'cantine', libelle: 'Cantine' }, { valeur: 'transport', libelle: 'Transport' }, { valeur: 'garderie', libelle: 'Garderie' }] }, P.texte('mois', 'Mois facturé (AAAA-MM)')],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const frais = await db.frais.findFirst({
        where: { ecoleId: c.identite.ecoleId, type: c.p.type, libelle: { contains: c.p.mois } },
      });
      const echeances = frais ? await db.echeanceFrais.findMany({ where: { eleveId: el.id, fraisId: frais.id } }) : [];
      const total = echeances.reduce((s, e) => s + (e.montant - e.remise), 0);
      if (!echeances.length) throw new ActionError(`Aucune facture ${c.p.type} trouvée pour ${c.p.mois} (lancez d'abord la facturation mensuelle dans Services).`, 'VIDE');
      return {
        titre: `Facture — ${c.p.type}`,
        sousTitre: `Mois de ${echapper(c.p.mois)}`,
        corps: tramePieceFinanciere({
          blocClientHtml: blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } }),
          tableauLignes: echeances.map((e: any) => ({ libelle: echapper(e.source || `Prestation ${c.p.type}`), details: `Mois ${c.p.mois}`, montant: e.montant - e.remise, statut: echapper(String(e.statut).replace('ee', 'ée')) })),
          totaux: [['Montant en lettres', montantEnLettres(total), false], ['TOTAL DU MOIS', formatXOF(total), true]],
          mentionPaiement: 'Facture payable dans les 10 jours. Règlement à la caisse ou par virement (RIB disponible sur demande).',
        }) + zoneSignature(c.identite, { qui: 'Le Service Comptabilité' }),
      };
    },
  },
  {
    code: 'autorisation_voyage', libelle: 'Autorisation de sortie scolaire / voyage', domaine: 'Services',
    description: 'Autorisation parentale complète (risques, assurance, urgence).',
    entete: 'majeur', permission: 'services.gerer',
    parametres: [P.eleve(), P.texte('destination', 'Destination'), P.date('debut', 'Du'), P.date('fin', 'Au'), P.texte('encadrants', 'Encadrants (noms)'), P.texte('cout', 'Coût et échéancier', '', false), P.textarea('programme', 'Programme / hébergement / restauration', false), P.textarea('risques', 'Risques spécifiques et trousse à prévoir', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const corps = trameAutorisation({
  identite: c.identite,
        titre: 'Autorisation de sortie scolaire avec hébergement',
        objetHtml: `Dans le cadre des activités pédagogiques de l'établissement <b>${echapper(c.identite.nom)}</b>, une sortie est organisée au profit de la classe de ${echapper(el.classeActuelle?.libelle || '—')}. L'autorisation parentale écrite est obligatoire.`,
        detailsHtml: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, classe: { libelle: el.classeActuelle?.libelle } })}
        ${tableauKV([
          ['Destination', echapper(c.p.destination)],
          ['Période', `du <b>${dateFr(c.p.debut)}</b> au <b>${dateFr(c.p.fin)}</b>`],
          ['Encadrants', echapper(c.p.encadrants)],
          ['Coût / échéancier', echapper(c.p.cout || 'à préciser')],
        ])}
        ${c.p.programme ? tableauKV([['Programme, hébergement, restauration', echapper(c.p.programme)]]) : ''}
        ${c.p.risques ? tableauKV([['Risques spécifiques / trousse', echapper(c.p.risques)]]) : ''}`,
        cases: [
          'J\'autorise mon enfant à participer à cette sortie, transport et hébergement compris',
          'J\'atteste que mon enfant est couvert par une assurance responsabilité civile et individuelle accident',
          'J\'autorise le responsable de la sortie à prendre toute mesure d\'urgence nécessaire (consultation, hospitalisation)',
          'Je certifie que mon enfant est à jour de ses vaccinations',
        ],
        dureeValidite: `Limitée à la sortie du ${dateFr(c.p.debut)} au ${dateFr(c.p.fin)}.`,
        mentionUrgence: true,
      });
      return {
        titre: 'Autorisation de sortie scolaire',
        corps: corps + `<table style="width:100%;margin-top:16px;font-size:10pt"><tr><td>Médecin traitant : <span class="points" style="min-width:170px"></span></td><td>Téléphone : <span class="points" style="min-width:140px"></span></td></tr>
        <tr style="height:8px"></tr><tr><td>Allergies / traitement en cours : <span class="points" style="min-width:280px"></span></td></tr></table>`,
      };
    },
  },
];

// --------------------------------------------------------------------
function parentsLignes(el: any): Array<[string, string]> {
  return (el.parents ?? []).map((ep: any) => [
    `${ep.parent.prenom} ${ep.parent.nom} (${ep.parent.lienAvecEleve || 'tuteur'})`,
    [ep.parent.telephone, ep.parent.email].filter(Boolean).join(' · ') || '—',
  ]);
}

export { docsSante, docsCommunication, docsAdmissions, docsServices };
