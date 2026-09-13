// ====================================================================
// CHARTE DOCUMENTAIRE — moteur d'en-têtes / pieds de page / signatures
// TOUT document produit par l'école hérite de cette charte. Les données
// (logo, cachet, signature, contacts) viennent des PARAMÈTRES ÉTABLIS-
// SEMENT : renseignés une fois, injectés partout, automatiquement.
// ====================================================================

import { db } from '@/lib/db';
import { formatXOF } from '@/lib/format';

export type Identite = {
  ecoleId: string;
  nom: string;
  devise: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  siteWeb: string;
  logo: string | null; // data-URL ou /api/fichiers/xxx
  cachet: string | null;
  signature: string | null; // signature scannée de la direction
  couleur: string;
  identifiants: { ninea?: string; autorisation?: string; affiliation?: string; [k: string]: string | undefined };
  anneeScolaire: string;
  nomDirection: string; // « Le Chef d'établissement » ou nom configuré
};

export async function resoudreIdentite(ecoleId: string): Promise<Identite> {
  const [ecole, annee] = await Promise.all([
    db.ecole.findUnique({ where: { id: ecoleId } }),
    db.anneeScolaire.findFirst({ where: { ecoleId, active: true } }),
  ]);
  if (!ecole) throw new Error('École introuvable.');
  let identifiants: Identite['identifiants'] = {};
  try { identifiants = JSON.parse(ecole.identifiantsLegaux || '{}'); } catch { /* JSON invalide → vide */ }
  const adresse = [ecole.adresse, ecole.ville].filter(Boolean).join(' — ');
  return {
    ecoleId,
    nom: ecole.nom,
    devise: ecole.deviseOfficielle || 'Excellence • Discipline • Réussite',
    adresse: adresse || 'Adresse à compléter dans Paramètres',
    ville: ecole.ville || '',
    telephone: ecole.telephone || '',
    email: ecole.emailEcole || '',
    siteWeb: ecole.siteWeb || '',
    logo: ecole.logoUrl || null,
    cachet: ecole.cachetUrl || null,
    signature: ecole.signatureUrl || null,
    couleur: ecole.couleurPrincipale || '#047857',
    identifiants,
    anneeScolaire: annee?.libelle ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    nomDirection: 'Le Chef d\'Établissement',
  };
}

// --------------------------------------------------------------------
// Utilitaires
// --------------------------------------------------------------------

export function echapper(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function dateFr(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function dateCourte(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR');
}

/** Numérotation officielle : BUL-202612-0184 */
export function reference(code: string): string {
  const d = new Date();
  return `${code.toUpperCase()}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function sousCent(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) { // soixante-dix / quatre-vingt-dix
    const base = d === 7 ? 'soixante' : 'quatre-vingt';
    return u === 0 ? `${base}-dix` : `${base}-${UNITES[10 + u]}`;
  }
  if (u === 0) return DIZAINES[d] + (d === 8 ? 's' : '');
  if (u === 1 && d !== 8) return `${DIZAINES[d]}-et-un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}
function sousMille(n: number): string {
  if (n < 100) return sousCent(n);
  const c = Math.floor(n / 100), r = n % 100;
  if (c === 1) return r ? `cent ${sousCent(r)}` : 'cent';
  return r ? `${UNITES[c]} cent ${sousCent(r)}` : `${UNITES[c]} cents`;
}

/** « 245 000 XOF » → « deux cent quarante-cinq mille francs CFA » */
export function montantEnLettres(centimes: number, devise = 'XOF'): string {
  const nomDevise = devise === 'XOF' ? 'francs CFA' : devise;
  const n = Math.floor(Math.abs(centimes) / 100);
  if (n === 0) return `zéro ${nomDevise}`;
  const morceaux: string[] = [];
  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;
  if (milliards) morceaux.push(`${milliards === 1 ? 'un milliard' : sousMille(milliards) + ' milliards'}`);
  if (millions) morceaux.push(`${millions === 1 ? 'un million' : sousMille(millions) + ' millions'}`);
  if (milliers) morceaux.push(`${milliers === 1 ? 'mille' : sousMille(milliers) + ' mille'}`);
  if (reste) morceaux.push(sousMille(reste));
  const s = morceaux.join(' ');
  return s + ' ' + nomDevise;
}

// --------------------------------------------------------------------
// EN-TÊTES (3 variantes)
// --------------------------------------------------------------------

function blocLogo(id: Identite, taille = 64): string {
  if (id.logo) {
    return `<img src="${echapper(id.logo)}" alt="logo" style="height:${taille}px;max-width:${taille * 1.4}px;object-fit:contain" />`;
  }
  return `<div style="height:${taille}px;width:${taille}px;border:2px solid ${id.couleur};border-radius:8px;display:flex;align-items:center;justify-content:center;color:${id.couleur};font-weight:700;font-size:${Math.round(taille / 3)}px">${echapper(id.nom.slice(0, 2).toUpperCase())}</div>`;
}

export function enTeteMajeur(id: Identite, opts: { type: string; ref: string; sousTitre?: string }): string {
  const contacts = [id.telephone, id.email, id.siteWeb].filter(Boolean).join(' · ');
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:4px">
    <tr>
      <td style="width:84px;vertical-align:middle;padding-right:12px">${blocLogo(id)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;letter-spacing:.4px;line-height:1.15">${echapper(id.nom.toUpperCase())}</div>
        ${id.devise ? `<div style="font-style:italic;font-size:10px;color:#555;margin-top:2px">« ${echapper(id.devise)} »</div>` : ''}
        <div style="font-size:9.5px;color:#444;margin-top:3px">Année scolaire ${echapper(id.anneeScolaire)}</div>
        <div style="font-size:9px;color:#666;margin-top:2px">${echapper(id.adresse)}${contacts ? ' · ' + echapper(contacts) : ''}</div>
      </td>
      <td style="width:132px;vertical-align:top;text-align:right">
        <div style="border:1.4px solid ${id.couleur};border-radius:6px;padding:7px 9px;display:inline-block;text-align:left;background:${id.couleur}08">
          <div style="font-size:10.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${id.couleur}">${echapper(opts.type)}</div>
          ${opts.sousTitre ? `<div style="font-size:9px;color:#444;margin-top:2px">${echapper(opts.sousTitre)}</div>` : ''}
          <div style="font-size:8.5px;color:#777;margin-top:4px">Réf. ${echapper(opts.ref)}<br/>Émis le ${dateCourte(new Date())}</div>
        </div>
      </td>
    </tr>
  </table>
  <div style="border-top:2.5px solid ${id.couleur};margin:6px 0 14px"></div>`;
}

export function enTeteMineur(id: Identite, opts: { type: string; numero: string; lieu?: string }): string {
  return `
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="width:46px;vertical-align:middle;padding-right:10px">${blocLogo(id, 40)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:Georgia,serif;font-size:14px;font-weight:700;text-transform:uppercase">${echapper(id.nom)}</div>
        <div style="font-size:9px;color:#555">${echapper([id.adresse, id.telephone, id.email].filter(Boolean).join(' · '))}</div>
      </td>
      <td style="vertical-align:middle;text-align:right">
        <div style="font-size:12.5px;font-weight:700">${echapper(opts.type)} ${echapper(opts.numero)}</div>
        <div style="font-size:10px;color:#444;font-style:italic">${echapper(opts.lieu || id.ville || 'Dakar')}, le ${dateFr(new Date())}</div>
      </td>
    </tr>
  </table>
  <div style="border-top:1.2px solid ${id.couleur};margin:8px 0 16px"></div>`;
}

export function enTeteFinancier(id: Identite, opts: { type: string; piece: string; echeance?: string }): string {
  return `
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="width:70px;vertical-align:middle;padding-right:12px">${blocLogo(id, 56)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;text-transform:uppercase">${echapper(id.nom)}</div>
        <div style="font-size:9.5px;color:#555;margin-top:2px">${echapper(id.adresse)}</div>
        ${id.identifiants.ninea ? `<div style="font-size:9px;color:#666">NINEA ${echapper(id.identifiants.ninea)}</div>` : ''}
      </td>
      <td style="width:150px;vertical-align:top;text-align:right">
        <div style="border:2px solid ${id.couleur};border-radius:6px;padding:8px 10px;background:${id.couleur}08;text-align:left">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:1px;color:#555">N° de pièce</div>
          <div style="font-size:13px;font-weight:800;color:${id.couleur}">${echapper(opts.piece)}</div>
          <div style="font-size:8.5px;color:#666;margin-top:3px">Émis le ${dateCourte(new Date())}${opts.echeance ? '<br/>Échéance : ' + echapper(opts.echeance) : ''}</div>
        </div>
      </td>
    </tr>
  </table>
  <div style="border-top:2.5px solid ${id.couleur};margin:6px 0 14px"></div>`;
}

// --------------------------------------------------------------------
// SIGNATURES + CACHET
// --------------------------------------------------------------------

export function zoneSignature(id: Identite, opts: { qui?: string; mention?: string; largeur?: number } = {}): string {
  const qui = opts.qui || id.nomDirection;
  return `
  <table style="width:${opts.largeur || 260}px;margin-left:auto;margin-top:26px;border-collapse:collapse">
    <tr>
      <td style="text-align:center;padding-bottom:2px">
        <div style="position:relative;width:200px;height:72px;margin:0 auto">
          ${id.signature ? `<img src="${echapper(id.signature)}" alt="signature" style="max-height:64px;max-width:190px;object-fit:contain;position:absolute;left:0;top:0" />` : ''}
          ${id.cachet ? `<img src="${echapper(id.cachet)}" alt="cachet" style="max-height:68px;max-width:110px;object-fit:contain;position:absolute;right:0;top:0;opacity:.9" />` : ''}
          ${!id.signature && !id.cachet ? `<div style="border:1px dashed #999;border-radius:6px;height:66px;display:flex;align-items:center;justify-content:center;color:#999;font-size:9px;text-align:center">Signature et cachet<br/>(à renseigner dans Paramètres)</div>` : ''}
        </div>
        <div style="border-top:1px solid #333;margin-top:4px;width:200px;margin-left:auto;margin-right:auto"></div>
        <div style="font-size:10.5px;font-weight:600;margin-top:3px">${echapper(qui)}</div>
        ${opts.mention ? `<div style="font-size:8.5px;color:#666">${echapper(opts.mention)}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

export function doubleSignature(id: Identite | null, gauche: { qui: string; mention?: string }, droite?: { qui: string; mention?: string }): string {
  const cell = (s: { qui: string; mention?: string }, img?: string | null) => `
    <td style="width:50%;text-align:center;padding-top:24px;vertical-align:bottom">
      <div style="height:60px">${img ? `<img src="${echapper(img)}" style="max-height:58px;max-width:150px;object-fit:contain" />` : ''}</div>
      <div style="border-top:1px solid #333;width:170px;margin:4px auto 0"></div>
      <div style="font-size:10px;font-weight:600;margin-top:3px">${echapper(s.qui)}</div>
      ${s.mention ? `<div style="font-size:8.5px;color:#666">${echapper(s.mention)}</div>` : ''}
    </td>`;
  const sig = id?.signature ?? null;
  const quiD = droite ?? { qui: id?.nomDirection ?? 'La Direction', mention: 'Cachet et signature' };
  return `<table style="width:100%;border-collapse:collapse;margin-top:30px"><tr>${cell(gauche)}${cell(quiD, sig)}</tr></table>`;
}

// --------------------------------------------------------------------
// PIED DE PAGE (3 zones + traçabilité)
// --------------------------------------------------------------------

export function piedDePage(id: Identite, opts: { ref?: string; confidentiel?: boolean; page?: boolean } = {}): string {
  const mentions = [
    id.identifiants.ninea ? `NINEA ${id.identifiants.ninea}` : '',
    id.identifiants.autorisation ? `Autorisation d'ouverture n° ${id.identifiants.autorisation}` : '',
    id.identifiants.affiliation ? id.identifiants.affiliation : '',
  ].filter(Boolean);
  return `
  <div style="margin-top:auto;padding-top:18px">
    ${opts.confidentiel ? `<div style="text-align:center;border:1.6px solid #b91c1c;color:#b91c1c;font-size:9px;font-weight:700;letter-spacing:2px;padding:3px;border-radius:4px;margin-bottom:6px">CONFIDENTIEL — DIFFUSION RESTREINTE</div>` : ''}
    <div style="border-top:1px solid #bbb;padding-top:6px">
      <table style="width:100%;border-collapse:collapse;font-size:7.6px;color:#666">
        <tr>
          <td style="width:34%;vertical-align:top">
            <div style="font-weight:600;color:#444">${echapper(id.nom)}</div>
            <div>${echapper(id.adresse)}</div>
            <div>${[id.telephone, id.email].filter(Boolean).map(echapper).join(' · ')}</div>
          </td>
          <td style="width:33%;text-align:center;vertical-align:top">
            ${mentions.length ? mentions.map((m) => `<div>${echapper(m)}</div>`).join('') : `<div>Établissement d'enseignement privé</div>`}
          </td>
          <td style="width:33%;text-align:right;vertical-align:top">
            <div>Document généré par ScolaGestion</div>
            <div>Réf. ${echapper(opts.ref)}${opts.page ? ' · Page <span class="num-page"></span>' : ''}</div>
            <div>${echapper(id.siteWeb)}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>`;
}

// --------------------------------------------------------------------
// PAGE COMPLÈTE (HTML imprimable A4)
// --------------------------------------------------------------------

export function pageHtml(opts: {
  identite: Identite;
  entete: string;
  titre?: string;
  corps: string;
  pied: string;
  autoImprimer?: boolean;
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${echapper(opts.titre || 'Document')}</title>
<style>
  @page { size: A4; margin: 14mm 13mm 16mm 13mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family:'Segoe UI',Inter,Arial,sans-serif;font-size:10.6pt;line-height:1.5;color:#1a1a1a;margin:0;display:flex;flex-direction:column;min-height:100vh }
  .feuille { display:flex;flex-direction:column;min-height:calc(100vh - 20px) }
  h2.titre-doc { font-family:Georgia,serif;text-align:center;font-size:15.5pt;letter-spacing:2.5px;text-transform:uppercase;margin:2px 0 4px;color:#111 }
  .sous-titre-doc { text-align:center;font-size:10pt;color:#444;margin-bottom:14px }
  table.data { width:100%;border-collapse:collapse;margin:8px 0 }
  table.data th { background:${opts.identite.couleur};color:#fff;font-size:9pt;padding:6px 8px;text-align:left;text-transform:uppercase;letter-spacing:.5px }
  table.data td { border-bottom:1px solid #e2e2e2;padding:5.5px 8px;font-size:9.6pt;vertical-align:top }
  table.data tr:nth-child(even) td { background:#f7faf9 }
  .cadre { border:1.3px solid ${opts.identite.couleur};border-radius:7px;padding:10px 14px;margin:10px 0 }
  .cadre-rouge { border:1.6px solid #b91c1c;border-radius:7px;padding:8px 12px;margin:8px 0;color:#7f1d1d;background:#fef2f2 }
  .section-titre { font-family:Georgia,serif;font-size:11.5pt;font-weight:700;color:${opts.identite.couleur};border-left:3.5px solid ${opts.identite.couleur};padding-left:8px;margin:16px 0 7px;text-transform:uppercase;letter-spacing:.6px;font-variant:small-caps }
  .champ { display:inline-block;margin:2px 18px 2px 0;font-size:10.3pt }
  .champ b { color:#333 }
  .total-encadre { border:2.2px solid ${opts.identite.couleur};border-radius:8px;padding:10px 16px;display:flex;justify-content:space-between;font-size:12pt;font-weight:800;color:${opts.identite.couleur};background:${opts.identite.couleur}0a }
  .mention-legale { font-size:8.6pt;color:#555;font-style:italic;margin-top:10px }
  .points { border-bottom:1px dotted #888;min-width:180px;display:inline-block }
  @media print { .no-print { display:none } body { min-height:auto } }
</style>
</head>
<body>
<div class="feuille">
  ${opts.entete}
  ${opts.titre ? `<h2 class="titre-doc">${echapper(opts.titre)}</h2>` : ''}
  <div style="flex:1">${opts.corps}</div>
  ${opts.pied}
</div>
${opts.autoImprimer ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},350)})</script>` : ''}
</body>
</html>`;
}

// --------------------------------------------------------------------
// Blocs réutilisables du corps
// --------------------------------------------------------------------

export function blocEleve(el: {
  prenom: string; nom: string; matricule?: string | null; dateNaissance?: Date | string | null;
  lieuNaissance?: string | null; classe?: { libelle: string } | null; regime?: string | null;
  photo?: string | null; lignes?: Array<[string, string]>;
}): string {
  const lignesExtra = (el.lignes || []).map(([k, v]) => `<span class="champ"><b>${echapper(k)} :</b> ${echapper(v)}</span>`).join('');
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
    <tr>
      ${el.photo ? `<td style="width:86px"><img src="${echapper(el.photo)}" style="height:84px;width:70px;object-fit:cover;border:1px solid #ccc;border-radius:5px"/></td>` : ''}
      <td style="vertical-align:middle;padding:4px 0 4px ${el.photo ? '12px' : '0'}">
        <div style="font-family:Georgia,serif;font-size:14.5pt;font-weight:700">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
        <div style="margin-top:4px">
          <span class="champ"><b>Matricule :</b> ${echapper(el.matricule || '—')}</span>
          <span class="champ"><b>Né(e) le :</b> ${dateFr(el.dateNaissance)}${el.lieuNaissance ? ' à ' + echapper(el.lieuNaissance) : ''}</span>
          <span class="champ"><b>Classe :</b> ${echapper(el.classe?.libelle || '—')}</span>
          ${el.regime ? `<span class="champ"><b>Régime :</b> ${echapper(el.regime)}</span>` : ''}
        </div>
        ${lignesExtra ? `<div style="margin-top:2px">${lignesExtra}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

export function mentionPiedClassique(): string {
  return `<div class="mention-legale">En foi de quoi, le présent document est délivré à l'intéressé(e) pour servir et valoir ce que de droit.</div>`;
}
