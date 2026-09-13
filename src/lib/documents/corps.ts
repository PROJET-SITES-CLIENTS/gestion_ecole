// ====================================================================
// CORPS DE DOCUMENTS — squelettes partagés (attestations, convocations,
// autorisations, notifications) : 80 % des documents officiels suivent
// ces trames normalisées; les cas complexes (bulletin, facture, paie…)
// ont leur constructeur dédié dans registre.ts.
// ====================================================================

import { Identite, echapper, dateFr, dateCourte, zoneSignature, doubleSignature, blocEleve } from './charte';
import { formatXOF } from '@/lib/format';

export function trameAttestation(opts: {
  titre: string;
  intro: string;
  blocsHtml: string;
  finale?: string;
  confidential?: boolean;
}): string {
  return `
  <h2 class="titre-doc">${echapper(opts.titre)}</h2>
  <div style="text-align:justify;font-size:10.8pt;margin-top:16px;line-height:1.75">
    ${opts.intro}
  </div>
  ${opts.blocsHtml}
  <div style="text-align:justify;font-size:10.8pt;margin-top:16px">
    ${echapper(opts.finale ?? 'En foi de quoi, le présent document est délivré à l\'intéressé(e) pour servir et valoir ce que de droit.')}
  </div>
  <div style="text-align:right;margin-top:8px;font-size:10.5pt">Fait le ${dateFr(new Date())}</div>`;
}

export function trameConvocation(opts: {
  identite?: Identite | null;
  destinataireHtml: string;
  motif: string;
  dateHeure: string;
  lieu: string;
  ordreDuJour: string[];
  obligatoire?: boolean;
  observations?: string;
  signataire: string;
}): string {
  return `
  <h2 class="titre-doc">Convocation</h2>
  <div class="cadre" style="margin-top:14px">${opts.destinataireHtml}</div>
  <p style="font-size:10.8pt;margin:14px 0 8px">Vous êtes prié(e) de vous présenter à l'établissement pour le motif suivant :
    <b>${echapper(opts.motif)}</b>.</p>
  <table style="width:100%;border-collapse:collapse;margin:10px 0">
    <tr>
      <td style="width:50%;padding:10px 12px;border:1px solid ${'#ddd'};background:#f7faf9">
        <b style="font-size:9.5pt;text-transform:uppercase;letter-spacing:1px;color:#555">Date et heure</b>
        <div style="font-size:12pt;font-weight:700;margin-top:4px">${echapper(opts.dateHeure)}</div>
      </td>
      <td style="width:50%;padding:10px 12px;border:1px solid #ddd;background:#f7faf9">
        <b style="font-size:9.5pt;text-transform:uppercase;letter-spacing:1px;color:#555">Lieu</b>
        <div style="font-size:12pt;font-weight:700;margin-top:4px">${echapper(opts.lieu)}</div>
      </td>
    </tr>
  </table>
  ${opts.ordreDuJour.length ? `
  <div class="section-titre">Ordre du jour</div>
  <ol style="margin:6px 0 0 22px;font-size:10.4pt;line-height:1.8">${opts.ordreDuJour.map((o) => `<li>${echapper(o)}</li>`).join('')}</ol>` : ''}
  ${opts.obligatoire ? `<div class="cadre-rouge" style="margin-top:14px">Cette convocation est de caractère <b>OBLIGATOIRE</b>. Toute absence doit être justifiée au préalable auprès de la vie scolaire.</div>` : ''}
  ${opts.observations ? `<p style="font-size:10pt;margin-top:12px"><b>Observations :</b> ${echapper(opts.observations)}</p>` : ''}
  <p style="font-size:10pt;margin-top:14px;font-style:italic">Possibilité de report sur demande écrite, au moins 48 h à l'avance.</p>`;
}

export function trameAutorisation(opts: {
  identite?: Identite | null;
  titre: string;
  objetHtml: string;
  detailsHtml: string;
  cases: string[];
  dureeValidite?: string;
  mentionUrgence?: boolean;
}): string {
  return `
  <h2 class="titre-doc">${echapper(opts.titre)}</h2>
  <div style="font-size:10.8pt;margin-top:14px;text-align:justify">${opts.objetHtml}</div>
  ${opts.detailsHtml}
  <div class="section-titre">Autorisations accordées</div>
  <table style="width:100%;border-collapse:collapse;margin:8px 0">
    ${opts.cases.map((c) => `
    <tr>
      <td style="width:26px;padding:7px 4px;border-bottom:1px solid #e5e5e5"><div style="width:15px;height:15px;border:1.7px solid #444;border-radius:3px"></div></td>
      <td style="padding:7px 6px;border-bottom:1px solid #e5e5e5;font-size:10.3pt">${echapper(c)}</td>
    </tr>`).join('')}
  </table>
  ${opts.dureeValidite ? `<p style="font-size:10pt"><b>Validité :</b> ${echapper(opts.dureeValidite)}</p>` : ''}
  ${opts.mentionUrgence ? `<div class="cadre-rouge">En cas d'urgence, l'établissement est autorisé à prendre toute mesure nécessaire, y compris le transfert vers le centre médical le plus proche.</div>` : ''}
  ${doubleSignature(opts.identite ?? null, { qui: 'Le Parent / Tuteur légal' }, { qui: 'La Direction' })}`;
}

export function trameNotification(opts: {
  titre: string;
  objet: string;
  corpsHtml: string;
  tableauDecisions?: Array<[string, string]>;
}): string {
  return `
  <h2 class="titre-doc">${echapper(opts.titre)}</h2>
  <p style="font-size:11pt;margin:14px 0 6px"><b>Objet :</b> ${echapper(opts.objet)}</p>
  <div style="font-size:10.8pt;text-align:justify">${opts.corpsHtml}</div>
  ${opts.tableauDecisions?.length ? `
  <div class="section-titre">Détail</div>
  <table class="data">${opts.tableauDecisions.map(([k, v]) => `<tr><td style="width:38%;font-weight:600">${echapper(k)}</td><td>${v}</td></tr>`).join('')}</table>` : ''}`;
}

export function trameFicheScolarite(opts: {
  eleveHtml: string;
  sectionsHtml: string;
}): string {
  return `${opts.eleveHtml}${opts.sectionsHtml}`;
}

export function tramePieceFinanciere(opts: {
  blocClientHtml: string;
  tableauLignes: Array<{ libelle: string; details?: string; montant: number; statut?: string }>;
  totaux: Array<[string, string, boolean?]>; // [libellé, valeur, saillant]
  mentionPaiement?: string;
  devise?: string;
}): string {
  const devise = opts.devise || 'XOF';
  const total = opts.tableauLignes.reduce((s, l) => s + l.montant, 0);
  return `
  ${opts.blocClientHtml}
  <table class="data" style="margin-top:12px">
    <thead><tr><th style="width:46%">Désignation</th><th>Détails</th><th style="width:16%;text-align:right">Montant</th><th style="width:13%">Statut</th></tr></thead>
    <tbody>
      ${opts.tableauLignes.map((l) => `
      <tr>
        <td>${echapper(l.libelle)}</td>
        <td style="font-size:9.2pt;color:#555">${echapper(l.details || '')}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${formatXOF(l.montant, devise)}</td>
        <td>${l.statut ? echapper(l.statut) : '—'}</td>
      </tr>`).join('')}
      <tr><td colspan="2" style="text-align:right;font-weight:700">TOTAL</td>
        <td style="text-align:right;font-weight:800;font-variant-numeric:tabular-nums">${formatXOF(total, devise)}</td><td></td></tr>
    </tbody>
  </table>
  ${opts.totaux.filter((t) => t[2]).map(([k, v]) => `
  <div class="total-encadre" style="margin-top:10px"><span>${echapper(k)}</span><span>${echapper(v)}</span></div>`).join('')}
  ${opts.totaux.filter((t) => !t[2]).length ? `
  <table style="width:100%;margin-top:8px;font-size:10pt">${opts.totaux.filter((t) => !t[2]).map(([k, v]) => `<tr><td style="text-align:right;padding:2px 0;color:#444">${echapper(k)}</td><td style="text-align:right;font-weight:700;width:160px">${echapper(v)}</td></tr>`).join('')}</table>` : ''}
  ${opts.mentionPaiement ? `<div class="mention-legale">${echapper(opts.mentionPaiement)}</div>` : ''}`;
}

export function signatureDirection(id: Identite, qui?: string) {
  return zoneSignature(id, { qui });
}

export { echapper, dateFr, dateCourte, blocEleve };
