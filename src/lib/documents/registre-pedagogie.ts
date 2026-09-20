// ====================================================================
// REGISTRE DOCUMENTAIRE — les 65 documents produits par l'établissement.
// Chaque entrée : code, libellé, domaine, variante d'en-tête, permission
// requise, paramètres (formulés par l'UI) et constructeur du corps.
// Données RÉELLES tirées de la base — identité/charte injectées par la
// route /api/documents/[code].
// ====================================================================

import { db } from '@/lib/db';
import { ActionError, Ctx } from '@/lib/business/commun';
import { formatXOF } from '@/lib/format';
import { Identite, echapper, dateFr, dateCourte, blocEleve, zoneSignature, doubleSignature, cadreDiplome, bandeauStats } from './charte';
import { trameAttestation, trameConvocation } from './corps';

import { ParamDoc, CtxDoc, ModeleDoc } from './registre-types';

// --------------------------------------------------------------------
// Aides de chargement (toujours filtrées par école = tenant)
// --------------------------------------------------------------------

async function eleveComplet(ecoleId: string, eleveId: string) {
  const el = await db.eleve.findFirst({
    where: { id: eleveId, ecoleId, deletedAt: null },
    include: { classeActuelle: { include: { niveau: true } }, parents: { include: { parent: true } } },
  });
  if (!el) throw new ActionError('Élève introuvable dans votre école.', 'INTROUVABLE');
  return el as any;
}

function parentsLignes(el: any): Array<[string, string]> {
  return (el.parents ?? []).map((ep: any) => [
    `${ep.parent.prenom} ${ep.parent.nom} (${ep.parent.lienAvecEleve || 'tuteur'})`,
    [ep.parent.telephone, ep.parent.email].filter(Boolean).join(' · ') || '—',
  ]);
}

const selectMention: ParamDoc = {
  cle: 'mention', libelle: 'Mention', type: 'select', requis: false,
  options: [
    { valeur: 'Passable', libelle: 'Passable' }, { valeur: 'Assez bien', libelle: 'Assez bien' },
    { valeur: 'Bien', libelle: 'Bien' }, { valeur: 'Très bien', libelle: 'Très bien' }, { valeur: 'Excellent', libelle: 'Excellent' },
  ],
};

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

// ====================================================================
// DOMAINE 1 — SCOLARITÉ & PÉDAGOGIE
// ====================================================================

async function corpsBulletin(c: CtxDoc, variante: 'college' | 'primaire' | 'maternelle'): Promise<{ titre: string; corps: string; sousTitre: string }> {
  const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
  if (!el.classeActuelle?.id) throw new ActionError('Cet élève n\'est affecté à aucune classe.', 'SANS_CLASSE');
  const bulletin = await db.bulletin.findFirst({
    where: { eleveId: el.id, periodeId: c.p.periodeId },
    orderBy: { version: 'desc' },
    include: { periode: true },
  });
  if (!bulletin) throw new ActionError('Aucun bulletin généré pour cet élève sur la période choisie (générez-le d\'abord dans Pédagogique).', 'INTROUVABLE');
  const periode = (bulletin as any).periode;
  const camarades = await db.bulletin.findMany({
    where: { classeId: el.classeActuelle.id, periodeId: c.p.periodeId },
    orderBy: { version: 'desc' },
  });
  const derniers = new Map<string, any>();
  for (const b of camarades) if (!derniers.has(b.eleveId)) derniers.set(b.eleveId, b);
  const toutes = [...derniers.values()].filter((b) => b.moyenneGenerale != null);

  let moyennes: Record<string, number> = {};
  try { moyennes = JSON.parse(bulletin.moyennes || '{}'); } catch { /* vide */ }
  const matieres = Object.keys(moyennes);

  const statsMatiere = matieres.map((m) => {
    const notes = [...derniers.values()].map((b) => { try { return JSON.parse(b.moyennes || '{}')[m]; } catch { return undefined; } }).filter((x: unknown): x is number => typeof x === 'number');
    return { m, min: notes.length ? Math.min(...notes) : null, max: notes.length ? Math.max(...notes) : null, moy: notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null };
  });

  const effectif = toutes.length;
  const moyClasse = effectif ? toutes.reduce((s, b) => s + (b.moyenneGenerale ?? 0), 0) / effectif : null;
  const mention = (m: number | null) => m == null ? '—' : m < 10 ? 'Insuffisant' : m < 12 ? 'Passable' : m < 14 ? 'Assez bien' : m < 16 ? 'Bien' : m < 18 ? 'Très bien' : 'Excellent';

  const tableNotes = variante === 'college' ? `
  <table class="data">
    <thead><tr><th>Matière</th><th style="width:12%;text-align:center">Note /20</th><th style="width:12%;text-align:center">Moy. classe</th><th style="width:11%;text-align:center">Min</th><th style="width:11%;text-align:center">Max</th><th style="width:10%;text-align:center">Coef</th></tr></thead>
    <tbody>
    ${matieres.map((m, i) => `<tr><td>${echapper(m)}</td><td style="text-align:center;font-weight:700">${(moyennes[m] ?? '—')}</td><td style="text-align:center">${statsMatiere[i].moy != null ? statsMatiere[i].moy!.toFixed(1) : '—'}</td><td style="text-align:center">${statsMatiere[i].min != null ? statsMatiere[i].min!.toFixed(1) : '—'}</td><td style="text-align:center">${statsMatiere[i].max != null ? statsMatiere[i].max!.toFixed(1) : '—'}</td><td style="text-align:center">${echapper(c.p['coef' + m] || '1')}</td></tr>`).join('')}
    </tbody>
  </table>` : variante === 'primaire' ? `
  <table class="data">
    <thead><tr><th>Matière</th><th style="width:22%;text-align:center">Acquisition (A/B/C/D)</th></tr></thead>
    <tbody>${matieres.map((m) => `<tr><td>${echapper(m)}</td><td style="text-align:center;font-weight:700">${echapper(String(moyennes[m] ?? '—'))}</td></tr>`).join('')}</tbody>
  </table>` : `
  <table class="data">
    <thead><tr><th>Compétence évaluée</th><th style="width:30%;text-align:center">Niveau d'acquisition</th></tr></thead>
    <tbody>${matieres.map((m) => `<tr><td>${echapper(m)}</td><td style="text-align:center;font-weight:700">${echapper(String(moyennes[m] ?? '—'))}</td></tr>`).join('')}</tbody>
  </table>`;

  const appreciations = await (db as any).bulletinAppreciation.findMany({ where: { bulletinId: bulletin.id } }).catch(() => []);
  const absences = periode ? await db.presence.findMany({ where: { eleveId: el.id, dateSaisie: { gte: periode.dateDebut, lte: periode.dateFin } } }).catch(() => []) : [];

  return {
    titre: variante === 'maternelle' ? 'Livret de compétences' : 'Bulletin scolaire',
    sousTitre: `${echapper(periode?.libelle || 'Période')} — ${echapper(el.classeActuelle.libelle)}`,
    corps: `
    ${blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, dateNaissance: el.dateNaissance, lieuNaissance: el.lieuNaissance, classe: { libelle: el.classeActuelle.libelle }, lignes: [['Professeur principal', c.p.pp || '—'], ['Effectif de la classe', String(effectif)]] })}
    ${tableNotes}
    ${bandeauStats(c.identite, [
      { libelle: 'Moyenne générale', valeur: `${bulletin.moyenneGenerale != null ? bulletin.moyenneGenerale.toFixed(2) : '—'}<span style="font-size:9pt;color:#77808b">/20</span>`, accent: true },
      { libelle: 'Rang', valeur: `${bulletin.rang ?? '—'}<span style="font-size:9pt;color:#77808b">${effectif ? ' / ' + effectif : ''}</span>` },
      { libelle: 'Moyenne de classe', valeur: moyClasse != null ? moyClasse.toFixed(2) : '—' },
      { libelle: 'Mention', valeur: mention(bulletin.moyenneGenerale ?? null) },
    ])}
    ${moyClasse != null ? `<p style="font-size:9.5pt;color:#555;text-align:right">Moyenne de la classe : ${moyClasse.toFixed(2)}/20</p>` : ''}
    ${appreciations.length ? `<div class="section-titre">Appréciations par matière</div>
      <table class="data">${appreciations.map((a: any) => `<tr><td style="width:26%;font-weight:600">${echapper(a.matiere || '')}</td><td style="font-style:italic">${echapper(a.appreciation || '')}</td></tr>`).join('')}</table>` : ''}
    ${bulletin.appreciationGenerale ? `<div class="section-titre">Appréciation générale du conseil de classe</div><div class="cadre" style="font-style:italic;text-align:justify">${echapper(bulletin.appreciationGenerale)}</div>` : ''}
    ${bulletin.decisionConseil ? `<div class="section-titre">Décision du conseil</div><p style="font-size:10.6pt"><b>${echapper(bulletin.decisionConseil)}</b></p>` : ''}
    <div class="section-titre">Assiduité sur la période</div>
    ${tableauKV([
      ['Absences (demi-journées)', String(absences.filter((a: any) => a.statut === 'absent').length)],
      ['Retards', String(absences.filter((a: any) => a.statut === 'retard').length)],
      ['Statut du document', echapper(bulletin.statut)],
    ])}
    ${doubleSignature(c.identite, { qui: 'Le Professeur principal' }, { qui: 'Le Chef d\'Établissement' })}`,
  };
}

const docsPedagogie: ModeleDoc[] = [
  {
    code: 'bulletin', libelle: 'Bulletin scolaire (collège/lycée)', domaine: 'Scolarité & pédagogie',
    description: 'Bulletin trimestriel officiel : notes, rang, mention, appréciations, décision du conseil.',
    entete: 'majeur', permission: 'eleves.lire',
    parametres: [P.eleve(), P.periode(), P.texte('pp', 'Professeur principal', 'Nom du PP affiché sur le bulletin', false)],
    generer: (c) => corpsBulletin(c, 'college'),
  },
  {
    code: 'bulletin_primaire', libelle: 'Bulletin scolaire (primaire — A/B/C/D)', domaine: 'Scolarité & pédagogie',
    description: 'Bulletin primaire avec niveaux d\'acquisition.',
    entete: 'majeur', permission: 'eleves.lire',
    parametres: [P.eleve(), P.periode()],
    generer: (c) => corpsBulletin(c, 'primaire'),
  },
  {
    code: 'bulletin_maternelle', libelle: 'Livret de compétences (maternelle)', domaine: 'Scolarité & pédagogie',
    description: 'Évaluation par compétences pour les classes maternelles.',
    entete: 'majeur', permission: 'eleves.lire',
    parametres: [P.eleve(), P.periode()],
    generer: (c) => corpsBulletin(c, 'maternelle'),
  },
  {
    code: 'releve_notes', libelle: 'Relevé de notes', domaine: 'Scolarité & pédagogie',
    description: 'Toutes les évaluations de l\'élève sur la période, sans appréciations.',
    entete: 'majeur', permission: 'eleves.lire',
    parametres: [P.eleve(), P.periode()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const notes = await db.note.findMany({
        where: { eleveId: el.id, evaluation: { periodeId: c.p.periodeId }, valeur: { not: null } },
        include: { evaluation: { include: { matiere: true } } },
        orderBy: [{ evaluation: { date: 'asc' } }],
      });
      const parMatiere = new Map<string, { n: number[] }>();
      for (const n of notes as any[]) {
        const k = n.evaluation?.matiere?.libelle || n.evaluation?.matiere?.code || '—';
        if (!parMatiere.has(k)) parMatiere.set(k, { n: [] });
        parMatiere.get(k)!.n.push(Number(n.valeur));
      }
      return {
        titre: 'Relevé de notes',
        sousTitre: echapper((await (db as any).periode.findUnique({ where: { id: c.p.periodeId } }))?.libelle || ''),
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } })}
        <table class="data">
          <thead><tr><th>Évaluation</th><th>Matière</th><th style="width:14%;text-align:center">Note</th><th style="width:16%">Date</th></tr></thead>
          <tbody>${(notes as any[]).map((n) => `<tr><td>${echapper(n.evaluation?.libelle || n.evaluation?.type || 'Évaluation')}</td><td>${echapper(n.evaluation?.matiere?.libelle || '—')}</td><td style="text-align:center;font-weight:700">${echapper(String(n.valeur))}</td><td>${dateCourte(n.evaluation?.date)}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#999">Aucune note sur la période</td></tr>'}</tbody>
        </table>
        ${parMatiere.size ? `<div class="section-titre">Synthèse par matière</div>
        <table class="data">${[...parMatiere.entries()].map(([m, v]) => `<tr><td style="width:50%">${echapper(m)}</td><td style="text-align:right;font-weight:700">${(v.n.reduce((s, x) => s + x, 0) / v.n.length).toFixed(2)}/20 <span style="color:#888;font-weight:400">(${v.n.length} note(s))</span></td></tr>`).join('')}</table>` : ''}
        ${zoneSignature(c.identite, { qui: 'Le Professeur principal' })}`,
      };
    },
  },
  {
    code: 'attestation_scolarite', libelle: 'Attestation de scolarité', domaine: 'Scolarité & pédagogie',
    description: 'Document officiel le plus demandé : preuve d\'inscription régulière.',
    entete: 'majeur', permission: 'eleves.lire', filigrane: 'Original',
    parametres: [P.eleve(), P.texte('motif', 'Motif (banque, organisme…)', 'Ex : inscription sportive', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Attestation de scolarité',
        sousTitre: `Année scolaire ${echapper(c.identite.anneeScolaire)}`,
        corps: trameAttestation({
          titre: 'Attestation de scolarité',
          intro: `Le Chef de l'établissement <b>${echapper(c.identite.nom)}</b> atteste que l'élève ci-dessous désigné(e) est régulièrement inscrit(e) et suit sa scolarité dans cet établissement${c.p.motif ? `, pour servir à : <b>${echapper(c.p.motif)}</b>` : ''}.`,
          blocsHtml: blocEleve({
            prenom: el.prenom, nom: el.nom, matricule: el.matricule, dateNaissance: el.dateNaissance, lieuNaissance: el.lieuNaissance,
            classe: { libelle: el.classeActuelle?.libelle },
            lignes: [['Date d\'entrée', dateFr(el.dateInscription)], ...parentsLignes(el)],
          }),
        }) + zoneSignature(c.identite) + mention('Faux et usage de faux punis par la loi. Toute falsification peut être vérifiée par la référence du document.'),
      };
    },
  },
  {
    code: 'certificat_fin_etudes', libelle: 'Certificat de fin d\'études', domaine: 'Scolarité & pédagogie',
    description: 'Certificat de fin de cycle avec mention.',
    entete: 'majeur', permission: 'bulletins.valider', filigrane: 'Original',
    parametres: [P.eleve(), P.texte('cycle', 'Cycle', 'Ex : Collège — Brevet de fin d\'études'), selectMention],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Certificat de fin d\'études',
        corps: cadreDiplome(c.identite, `
          <div style="text-align:center">
            <div style="font-family:Georgia,serif;font-size:12pt;text-transform:uppercase;letter-spacing:3.5px;color:#374151">L'établissement</div>
            <div style="font-family:Georgia,serif;font-size:15pt;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${c.identite.couleur}">${echapper(c.identite.nom)}</div>
            <div style="font-size:9.8pt;color:#565f6b;margin:10px 0 20px;font-style:italic">vu les résultats du conseil de classe et conformément au règlement de l'établissement,</div>
            <div style="font-size:10.8pt">délivre le présent certificat de fin d'études à</div>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:23pt;font-weight:800;margin:16px 0;color:#111418">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
            <div style="width:180px;margin:0 auto 14px;border-top:1.4px solid ${c.identite.couleur}"></div>
            <div style="font-size:10.6pt">né(e) le ${dateFr(el.dateNaissance)} à ${echapper(el.lieuNaissance || '—')}<br/>pour avoir accompli avec succès le cycle : <b>${echapper(c.p.cycle || el.classeActuelle?.niveau?.libelle || '—')}</b></div>
            <div style="margin:18px 0;font-size:13pt">Mention : <b style="letter-spacing:1px">${echapper(c.p.mention || '—')}</b></div>
          </div>`)
          + doubleSignature(c.identite, { qui: 'Le Président du conseil de classe' }, { qui: 'Le Chef d\'Établissement' }),
      
      };
    },
  },
  {
    code: 'certificat_transfert', libelle: 'Certificat de transfert / radiation', domaine: 'Scolarité & pédagogie',
    description: 'Départ officiel d\'un élève — vérifie le solde de scolarité.',
    entete: 'majeur', permission: 'eleves.ecrire',
    parametres: [P.eleve(), P.texte('motif', 'Motif du départ', 'Ex : mutation familiale')],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      if (el.statut === 'actif') throw new ActionError('Cet élève est toujours actif : effectuez d\'abord sa sortie (module Élèves).', 'ELEVE_ACTIF');
      const echeances = await db.echeanceFrais.findMany({ where: { eleveId: el.id, statut: { in: ['impayee', 'partiel'] } } });
      const impayes = echeances.reduce((s, e) => s + (e.montant - e.remise - e.montantPaye), 0);
      return {
        titre: 'Certificat de transfert',
        corps: trameAttestation({
          titre: 'Certificat de transfert et de radiation',
          intro: `Le Chef de l'établissement certifie que l'élève ci-dessous a quitté l'établissement pour le motif suivant : <b>${echapper(c.p.motif || '—')}</b>.`,
          blocsHtml: blocEleve({
            prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle || '—' },
            lignes: [['Date d\'entrée', dateFr(el.dateInscription)], ['Date de sortie', dateFr(el.dateSortie)], ...parentsLignes(el)],
          }) + tableauKV([
            ['Situation financière', impayes > 0 ? `<span style="color:#b91c1c;font-weight:700">Solde impayé : ${formatXOF(impayes)}</span>` : '<span style="color:#047857;font-weight:700">Aucun solde impayé — situation réglée</span>'],
            ['Dernier niveau fréquenté', echapper(el.classeActuelle?.niveau?.libelle || '—')],
            ['Régime', echapper(el.regime || 'externe')],
          ], 'Situation administrative'),
        }) + zoneSignature(c.identite) + (impayes > 0 ? `<div class="cadre-rouge">Ce certificat est délivré sous réserve du règlement du solde de ${formatXOF(impayes)}.</div>` : ''),
      };
    },
  },
  {
    code: 'edt_classe', libelle: 'Emploi du temps de classe', domaine: 'Scolarité & pédagogie',
    description: 'Grille hebdomadaire officielle d\'une classe.',
    entete: 'majeur', permission: 'edt.gerer',
    parametres: [P.classe()],
    generer: async (c) => {
      const classe = await db.classe.findFirst({ where: { id: c.p.classeId, ecoleId: c.identite.ecoleId }, include: { niveau: true } });
      if (!classe) throw new ActionError('Classe introuvable.', 'INTROUVABLE');
      const creneaux = await db.emploiTemps.findMany({
        where: { classeId: classe.id, statut: 'actif' },
        include: { matiere: true, salle: true, enseignant: true },
      });
      const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const heures = [...new Set(creneaux.map((x: any) => `${x.heureDebut}-${x.heureFin}`))].sort();
      const cell = (j: string, h: string) => {
        const cr = (creneaux as any[]).find((x) => x.jour === j && `${x.heureDebut}-${x.heureFin}` === h);
        return cr ? `<div style="font-weight:600">${echapper(cr.matiere?.libelle || cr.matiere?.code || '')}</div><div style="font-size:7.6pt;color:#555">${echapper(cr.salle?.code || '')}${cr.enseignant ? ' · ' + echapper(cr.enseignant.prenom + ' ' + cr.enseignant.nom) : ''}</div>` : '';
      };
      return {
        titre: 'Emploi du temps',
        sousTitre: echapper(classe.libelle),
        corps: `
        <table class="data" style="table-layout:fixed">
          <thead><tr><th style="width:12%">Horaire</th>${JOURS.map((j) => `<th style="text-align:center">${j.charAt(0).toUpperCase() + j.slice(1)}</th>`).join('')}</tr></thead>
          <tbody>${heures.map((h) => `<tr><td style="font-size:8.6pt;font-weight:600;white-space:nowrap">${echapper(h)}</td>${JOURS.map((j) => `<td style="height:34px">${cell(j, h)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:#999">Aucun créneau défini</td></tr>'}</tbody>
        </table>
        ${mention('Emploi du temps susceptible de modifications en cours d\'année.')} ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'edt_enseignant', libelle: 'Emploi du temps d\'enseignant', domaine: 'Scolarité & pédagogie',
    description: 'Grille hebdomadaire personnelle d\'un enseignant.',
    entete: 'majeur', permission: 'edt.gerer',
    parametres: [P.personnel()],
    generer: async (c) => {
      const pers = await db.personnel.findFirst({ where: { id: c.p.personnelId, ecoleId: c.identite.ecoleId } });
      if (!pers) throw new ActionError('Personnel introuvable.', 'INTROUVABLE');
      const creneaux = await db.emploiTemps.findMany({
        where: { enseignantId: pers.id, statut: 'actif' },
        include: { matiere: true, salle: true, classe: true },
      });
      const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const heures = [...new Set(creneaux.map((x: any) => `${x.heureDebut}-${x.heureFin}`))].sort();
      return {
        titre: 'Emploi du temps',
        sousTitre: `${echapper(pers.prenom)} ${echapper(pers.nom)} — enseignant`,
        corps: `
        <table class="data" style="table-layout:fixed">
          <thead><tr><th style="width:12%">Horaire</th>${JOURS.map((j) => `<th style="text-align:center">${j.charAt(0).toUpperCase() + j.slice(1)}</th>`).join('')}</tr></thead>
          <tbody>${heures.map((h) => `<tr><td style="font-size:8.6pt;font-weight:600">${echapper(h)}</td>${JOURS.map((j) => {
            const cr = (creneaux as any[]).find((x) => x.jour === j && `${x.heureDebut}-${x.heureFin}` === h);
            return `<td>${cr ? `<b>${echapper(cr.classe?.libelle || '')}</b><div style="font-size:7.6pt">${echapper(cr.matiere?.libelle || '')} · ${echapper(cr.salle?.code || '')}</div>` : ''}</td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'pv_conseil', libelle: 'PV de conseil de classe', domaine: 'Scolarité & pédagogie',
    description: 'Procès-verbal officiel du conseil : présences, décisions, délibérations.',
    entete: 'majeur', permission: 'bulletins.valider',
    parametres: [{ cle: 'conseilId', libelle: 'Conseil', type: 'texte', requis: true, aide: 'Identifiant du conseil (module Conseils de classe)' }],
    generer: async (c) => {
      const conseil = await (db as any).conseilClasse.findFirst({
        where: { id: c.p.conseilId, ecoleId: c.identite.ecoleId },
        include: { classe: true, periode: true, membres: true, deliberations: true },
      });
      if (!conseil) throw new ActionError('Conseil introuvable dans votre école.', 'INTROUVABLE');
      return {
        titre: 'Procès-verbal de conseil de classe',
        sousTitre: `${echapper(conseil.classe?.libelle || '')} — ${echapper(conseil.periode?.libelle || '')} — ${dateFr(conseil.date)}`,
        corps: `
        ${tableauKV([
          ['Classe', echapper(conseil.classe?.libelle || '—')], ['Période', echapper(conseil.periode?.libelle || '—')],
          ['Date et salle', `${dateFr(conseil.date)} — ${echapper(conseil.salle || '—')}`], ['Statut', echapper(conseil.statut)],
        ])}
        <div class="section-titre">Membres présents</div>
        <table class="data"><thead><tr><th>Membre</th><th>Fonction</th><th style="width:20%">Émargement</th></tr></thead>
        <tbody>${(conseil.membres ?? []).map((m: any) => `<tr><td>${echapper(m.nom || m.membre || '—')}</td><td>${echapper(m.fonction || m.role || '—')}</td><td></td></tr>`).join('') || '<tr><td colspan="3" style="color:#999">Aucun membre enregistré</td></tr>'}</tbody></table>
        ${conseil.compteRendu ? `<div class="section-titre">Compte rendu</div><div class="cadre" style="text-align:justify">${echapper(conseil.compteRendu)}</div>` : ''}
        ${(conseil.deliberations ?? []).length ? `<div class="section-titre">Délibérations</div>
        <table class="data"><thead><tr><th>Élève</th><th>Décision</th></tr></thead><tbody>${(conseil.deliberations ?? []).map((d: any) => `<tr><td>${echapper(d.eleve || '—')}</td><td>${echapper(d.decision || d.libelle || '—')}</td></tr>`).join('')}</tbody></table>` : ''}
        ${doubleSignature(c.identite, { qui: 'Le Professeur principal' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
  {
    code: 'rapport_orientation', libelle: 'Rapport d\'orientation', domaine: 'Scolarité & pédagogie',
    description: 'Synthèse annuelle et proposition d\'orientation.',
    entete: 'majeur', permission: 'bulletins.valider',
    parametres: [P.eleve(), P.texte('synthese', 'Synthèse de l\'élève', '', false), P.texte('voeux', 'Vœux de la famille (1, 2, 3)', '', false), P.texte('avis', 'Avis du professeur principal', '', false), P.texte('decision', 'Décision du conseil d\'orientation', '', false)],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const bulletins = await db.bulletin.findMany({ where: { eleveId: el.id }, orderBy: { version: 'desc' } });
      const derniers = new Map<string, any>(); for (const b of bulletins) if (!derniers.has(b.periodeId)) derniers.set(b.periodeId, b);
      const perfs = [...derniers.values()];
      const moyenneAnnee = perfs.length ? perfs.reduce((s, b) => s + (b.moyenneGenerale ?? 0), 0) / perfs.filter((b) => b.moyenneGenerale != null).length : null;
      return {
        titre: 'Rapport d\'orientation',
        sousTitre: echapper(el.classeActuelle?.libelle || ''),
        corps: `
        ${blocEleve({ prenom: el.prenom, nom: el.nom, matricule: el.matricule, classe: { libelle: el.classeActuelle?.libelle } })}
        ${tableauKV([['Moyenne générale (année)', moyenneAnnee != null ? `<b>${moyenneAnnee.toFixed(2)}/20</b> sur ${perfs.length} période(s)` : '—'], ['Perf. par période', perfs.map((b) => `${(b.moyenneGenerale ?? '—')}`).join(' · ') || '—']])}
        ${c.p.synthese ? tableauKV([['Synthèse', echapper(c.p.synthese)]]) : ''}
        ${c.p.voeux ? tableauKV([['Vœux de la famille', echapper(c.p.voeux)]]) : ''}
        ${c.p.avis ? tableauKV([['Avis du PP', echapper(c.p.avis)]]) : ''}
        ${c.p.decision ? `<div class="total-encadre"><span>Décision du conseil d'orientation</span><span>${echapper(c.p.decision)}</span></div>` : ''}
        ${doubleSignature(c.identite, { qui: 'Le Professeur principal' }, { qui: 'Le Chef d\'Établissement' })}`,
      };
    },
  },
  {
    code: 'liste_fournitures', libelle: 'Liste de fournitures', domaine: 'Scolarité & pédagogie',
    description: 'Fournitures demandées pour un niveau.',
    entete: 'majeur',
    parametres: [{ cle: 'niveau', libelle: 'Niveau', type: 'texte', requis: false }, { cle: 'items', libelle: 'Fournitures (une par ligne : libellé | quantité)', type: 'textarea', requis: true }],
    generer: async (c) => {
      const items = c.p.items.split('\n').map((l) => l.trim()).filter(Boolean);
      return {
        titre: 'Liste de fournitures scolaires',
        sousTitre: echapper(c.p.niveau || c.identite.anneeScolaire),
        corps: `
        <table class="data"><thead><tr><th>Fourniture</th><th style="width:18%;text-align:center">Quantité</th><th style="width:22%">Caractère</th></tr></thead>
        <tbody>${items.map((l, i) => { const [lib, qte] = l.split('|'); return `<tr><td>${echapper((lib || '').trim())}</td><td style="text-align:center">${echapper((qte || '1').trim())}</td><td>${i < 2 ? 'Obligatoire' : 'Conseillée'}</td></tr>`; }).join('')}</tbody></table>
        ${mention('Aucune fourniture n\'est commercialisée par l\'établissement.')} ${zoneSignature(c.identite)}`,
      };
    },
  },
  {
    code: 'fiche_inscription', libelle: 'Fiche d\'inscription élève', domaine: 'Scolarité & pédagogie',
    description: 'Fiche officielle d\'inscription/réinscription avec autorisations.',
    entete: 'majeur', permission: 'eleves.lire',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      return {
        titre: 'Fiche d\'inscription',
        sousTitre: `Année scolaire ${echapper(c.identite.anneeScolaire)}`,
        corps: `
        ${tableauKV([
          ['Élève', `${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}`], ['Matricule', echapper(el.matricule || 'attribué à l\'inscription')],
          ['Né(e) le', `${dateFr(el.dateNaissance)} à ${echapper(el.lieuNaissance || '—')}`], ['Sexe', echapper(el.sexe || '—')],
          ['Classe demandée', echapper(el.classeActuelle?.libelle || '—')], ['Établissement précédent', echapper(el.etablissementPrecedent || '—')],
          ...parentsLignes(el).map(([k, v]): [string, string] => ['Responsable', `${k} — ${v}`]),
        ], 'A — Identification')}
        ${tableauKV([
          ['Allergies connues', echapper(el.allergies || 'aucune signalée')],
          ['Condition médicale', echapper(el.conditionMedicale || 'aucune signalée')],
          ['Contact d\'urgence', echapper(el.contactUrgence || el.parents?.[0]?.parent?.telephone || '—')],
        ], 'B — Santé (l\'essentiel — le détail relève de l\'infirmerie)')}
        <div class="section-titre">C — Autorisations et engagements</div>
        ${['Je soussigné(e), responsable légal, certifie l\'exactitude des renseignements ci-dessus.',
           'J\'autorise mon enfant à participer aux sorties pédagogiques organisées par l\'établissement.',
           'J\'autorise l\'établissement à administrer les premiers soins d\'urgence en cas de nécessité.',
           'J\'autorise l\'utilisation de l\'image de mon enfant dans le cadre strict des activités scolaires.'].map((t) => `
        <table style="width:100%;margin:5px 0"><tr><td style="width:22px"><div style="width:14px;height:14px;border:1.6px solid #444;border-radius:3px"></div></td><td style="font-size:9.8pt">${echapper(t)}</td></tr></table>`).join('')}
        ${doubleSignature(c.identite, { qui: 'Le Responsable légal (lu et approuvé)' }, { qui: 'La Direction (cachet)' })}`,
      };
    },
  },
  {
    code: 'convocation_conseil', libelle: 'Convocation au conseil de classe', domaine: 'Scolarité & pédagogie',
    description: 'Convocation des membres du conseil.',
    entete: 'mineur', permission: 'bulletins.valider',
    parametres: [P.classe(), P.periode(), P.date('date', 'Date du conseil'), P.texte('heure', 'Heure', 'Ex : 09h00'), P.texte('salle', 'Salle'), P.texte('destinataire', 'Destinataire', 'Nom et fonction du membre convoqué')],
    generer: async (c) => {
      const classe = await db.classe.findFirst({ where: { id: c.p.classeId, ecoleId: c.identite.ecoleId } });
      const periode = await (db as any).periode.findUnique({ where: { id: c.p.periodeId } });
      return {
        titre: '',
        corps: trameConvocation({
  identite: c.identite,
          destinataireHtml: `<div style="font-size:11pt"><b>${echapper(c.p.destinataire)}</b><div style="font-size:9.6pt;color:#555">Membre du conseil de classe — ${echapper(classe?.libelle || '')}</div></div>`,
          motif: `Conseil de classe ${echapper(periode?.libelle || '')} — classe de ${echapper(classe?.libelle || '')}`,
          dateHeure: `${dateFr(c.p.date)} à ${echapper(c.p.heure)}`,
          lieu: echapper(c.p.salle),
          ordreDuJour: ['Appel et vérification du quorum', 'Résultats de la classe et moyennes', 'Examen des situations individuelles', 'Appréciations et décisions (félicitations, avertissements travail)', 'Questions diverses'],
          obligatoire: true,
          signataire: 'Le Chef d\'Établissement',
        }) + zoneSignature(c.identite, { qui: 'Le Chef d\'Établissement', mention: 'Convocation à conserver' }),
      };
    },
  },

// ====================================================================
// SECRETARIAT — carte scolaire, duplicata, anciens élèves
// ====================================================================

  {
    code: 'carte_scolaire', libelle: 'Carte scolaire élève', domaine: 'Scolarité & pédagogie',
    description: 'Carte nominative d\'identité scolaire (photo, matricule, classe, validité annuelle).',
    entete: 'majeur', permission: 'eleves.ecrire',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const parent0 = el.parents?.[0]?.parent;
      return {
        titre: '',
        corps: `
        <div style="display:flex;justify-content:center">
        <div style="width:430px;border:2.5px solid ${c.identite.couleur};border-radius:14px;overflow:hidden">
          <div style="background:${c.identite.couleur};color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-weight:800;letter-spacing:2px">CARTE SCOLAIRE</div>
            <div style="font-size:9pt">${echapper(c.identite.nom)}</div>
          </div>
          <div style="padding:14px 16px;display:flex;gap:14px">
            <div style="width:74px;height:88px;border:1.5px dashed #aaa;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:8pt;text-align:center">${el.photoUrl ? `<img src="${echapper(el.photoUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:7px"/>` : 'Photo<br/>élève'}</div>
            <div style="flex:1">
              <div style="font-size:15pt;font-weight:800">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
              <div style="font-size:10pt;color:#444;margin-top:3px">${echapper(el.classeActuelle?.libelle || '—')} · Matricule ${echapper(el.matricule || '—')}</div>
              <div style="margin-top:9px;font-size:10.6pt"><b>Né(e) le :</b> ${dateFr(el.dateNaissance)}</div>
              ${parent0 ? `<div style="font-size:10.6pt"><b>Contact :</b> ${echapper(parent0.prenom || '')} ${echapper(parent0.nom || '')} · ${echapper(parent0.telephone || '—')}</div>` : ''}
              <div style="font-size:10.6pt"><b>Validité :</b> année ${echapper(c.identite.anneeScolaire)}</div>
            </div>
          </div>
          <div style="background:#f4f8f7;padding:8px 16px;font-size:8.6pt;color:#444;display:flex;justify-content:space-between">
            <div><b>Carte strictement nominative.</b> À présenter à toute demande.<br/>Perte : ${formatXOF(200000)}.</div>
            <div style="text-align:right">${echapper(c.identite.telephone || '')}</div>
          </div>
        </div>
        </div>`,
      };
    },
  },
  {
    code: 'duplicata_bulletin', libelle: 'Duplicata de bulletin (perte)', domaine: 'Scolarité & pédagogie',
    description: 'Copie de secours du bulletin estampillée DUPLICATA (variante détectée automatiquement : maternelle/primaire/collège).',
    entete: 'majeur', permission: 'eleves.ecrire', filigrane: 'DUPLICATA',
    parametres: [P.eleve(), P.periode()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      const cycleCode = (el.classeActuelle as any)?.niveau?.section?.cycle?.code;
      const variante = cycleCode === 'MAT' ? 'maternelle' : cycleCode === 'PRIM' ? 'primaire' : 'college';
      const r = await corpsBulletin(c, variante);
      return {
        ...r,
        sousTitre: `${r.sousTitre || ''} — DUPLICATA délivré le ${dateFr(new Date())} (document original perdu)`.replace(/^ — /, ''),
        corps: r.corps + `<div class="mention-legale">Duplicata délivré à la famille le ${dateFr(new Date())}. Toute reproduction du document original est sans valeur.</div>`,
      };
    },
  },
  {
    code: 'attestation_ancien_eleve', libelle: 'Attestation de scolarité (ancien élève)', domaine: 'Scolarité & pédagogie',
    description: 'Attestation rétroactive pour un élève sorti : période de fréquentation et classes parcourues.',
    entete: 'majeur', permission: 'eleves.ecrire',
    parametres: [P.eleve()],
    generer: async (c) => {
      const el = await eleveComplet(c.identite.ecoleId, c.p.eleveId);
      if (el.statut === 'actif') throw new ActionError('Cet élève est encore actif — utilisez le certificat de scolarité classique.', 'ELEVE_ACTIF');
      const historique = await db.eleveHistoriqueClasse.findMany({
        where: { eleveId: el.id },
        include: { classe: true },
        orderBy: { dateEntree: 'asc' },
      });
      const du = el.dateInscription ?? historique[0]?.dateEntree;
      const au = el.dateSortie ?? historique[historique.length - 1]?.dateSortie;
      const parcours = historique.length
        ? historique.map((h: any) => `${echapper(h.classe?.libelle || '—')} (${dateCourte(h.dateEntree)} → ${h.dateSortie ? dateCourte(h.dateSortie) : 'en cours'})`).join('<br/>')
        : '—';
      return {
        titre: 'Attestation de fréquentation scolaire',
        sousTitre: `Ancien élève · ${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}`,
        corps: trameAttestation({
          titre: 'Attestation de fréquentation scolaire',
          intro: `Le Chef de l'établissement <b>${echapper(c.identite.nom)}</b> atteste que l'élève ci-dessous désigné(e) a fréquenté l'établissement (ancien élève${el.motifSortie ? `, motif de sortie : ${echapper(el.motifSortie)}` : ''}).`,
          blocsHtml: blocEleve({
            prenom: el.prenom, nom: el.nom, matricule: el.matricule, dateNaissance: el.dateNaissance, lieuNaissance: el.lieuNaissance,
            lignes: [
              ['Période de fréquentation', `${du ? dateFr(du) : '—'} → ${au ? dateFr(au) : '—'}`],
              ['Statut', echapper(el.statut)],
              ['Parcours', parcours],
            ],
          }),
          finale: 'La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.',
        }) + zoneSignature(c.identite, { qui: 'Le Chef d\'Établissement' }) + mention('Attestation délivrée sur les archives de l\'établissement — vérifiable auprès de la scolarité.'),
      };
    },
  },
];

export { selectMention, docsPedagogie };
