// ====================================================================
// CHARTE DOCUMENTAIRE v2 — HAUTE QUALITÉ
// Moteur d'en-têtes / pieds / signatures / composition typographique.
// Esthétique académique : serif d'apparat pour les titres, doubles
// filets classiques, petites capitales, filigrane, cadres ornementaux.
// Les données (logo, cachet, signature, contacts) viennent des
// PARAMÈTRES ÉTABLISSEMENT — injectés partout automatiquement.
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
  logo: string | null;
  cachet: string | null;
  signature: string | null;
  couleur: string;
  identifiants: { ninea?: string; autorisation?: string; affiliation?: string; [k: string]: string | undefined };
  anneeScolaire: string;
  nomDirection: string;
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

/** Nuances calculées d'une couleur hex (mélange vers blanc). */
function nuance(hex: string, versBlanc: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const cible = Math.round(255 * versBlanc);
  const mix = (canal: number) => Math.round(canal + (cible - canal) * versBlanc);
  return '#' + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function assombrir(hex: string, facteur = 0.35): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (canal: number) => Math.round(canal * (1 - facteur));
  return '#' + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function sousCent(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) {
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
  return morceaux.join(' ') + ' ' + nomDevise;
}

// --------------------------------------------------------------------
// EN-TÊTES (3 variantes) — composition académique soignée
// --------------------------------------------------------------------

function blocLogo(id: Identite, taille = 64): string {
  if (id.logo) {
    return `<img src="${echapper(id.logo)}" alt="logo" style="height:${taille}px;max-width:${taille * 1.5}px;object-fit:contain" />`;
  }
  return `<div style="height:${taille}px;width:${taille}px;border:1.5px solid ${nuance(id.couleur, 0.45)};border-radius:10px;display:flex;align-items:center;justify-content:center;color:${id.couleur};font-family:Georgia,serif;font-weight:700;font-size:${Math.round(taille / 3.2)}px;letter-spacing:1px">${echapper(id.nom.slice(0, 2).toUpperCase())}</div>`;
}

/** Double filet classique : trait épais + filet fin (style papeterie). */
function doubleFilet(couleur: string): string {
  return `<div style="margin-top:7px;border-top:2.6px solid ${couleur}"></div><div style="margin-top:1.6px;border-top:0.8px solid ${nuance(couleur, 0.35)}"></div>`;
}

export function enTeteMajeur(id: Identite, opts: { type: string; ref: string; sousTitre?: string }): string {
  const contacts = [id.telephone, id.email, id.siteWeb].filter(Boolean).join('  ·  ');
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:2px">
    <tr>
      <td style="width:88px;vertical-align:middle;padding-right:14px">${blocLogo(id)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:20px;font-weight:800;letter-spacing:.8px;line-height:1.12">${echapper(id.nom.toUpperCase())}</div>
        ${id.devise ? `<div style="font-family:Georgia,serif;font-style:italic;font-size:10px;color:#6b7280;margin-top:3px;letter-spacing:.6px">« ${echapper(id.devise)} »</div>` : ''}
        <div style="font-size:9px;color:#4b5563;margin-top:5px;letter-spacing:1.6px;text-transform:uppercase">Année scolaire ${echapper(id.anneeScolaire)}</div>
        <div style="font-size:8.6px;color:#8a919c;margin-top:2.5px">${echapper(id.adresse)}${contacts ? '<br/>' + echapper(contacts) : ''}</div>
      </td>
      <td style="width:138px;vertical-align:top;text-align:right">
        <div style="border:1px solid ${nuance(id.couleur, 0.55)};border-top:3px solid ${id.couleur};border-radius:0 0 7px 7px;padding:7px 10px;display:inline-block;text-align:left;background:linear-gradient(180deg,${nuance(id.couleur, 0.94)} 0%,#ffffff 100%)">
          <div style="font-size:9.6px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:${assombrir(id.couleur, 0.25)};line-height:1.25">${echapper(opts.type)}</div>
          ${opts.sousTitre ? `<div style="font-size:8.4px;color:#565f6b;margin-top:3px;line-height:1.3">${echapper(opts.sousTitre)}</div>` : ''}
          <div style="font-size:7.8px;color:#8a919c;margin-top:5px;border-top:0.7px solid ${nuance(id.couleur, 0.75)};padding-top:3.5px">Réf. <b style="font-variant-numeric:tabular-nums">${echapper(opts.ref)}</b><br/>Émis le ${dateCourte(new Date())}</div>
        </div>
      </td>
    </tr>
  </table>
  ${doubleFilet(id.couleur)}
  <div style="height:13px"></div>`;
}

export function enTeteMineur(id: Identite, opts: { type: string; numero: string; lieu?: string }): string {
  return `
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="width:48px;vertical-align:middle;padding-right:11px">${blocLogo(id, 42)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:Georgia,serif;font-size:14.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase">${echapper(id.nom.toUpperCase())}</div>
        <div style="font-size:8.6px;color:#8a919c;margin-top:2px">${echapper([id.adresse, id.telephone, id.email].filter(Boolean).join('  ·  '))}</div>
      </td>
      <td style="vertical-align:middle;text-align:right">
        <div style="font-size:12.5px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${assombrir(id.couleur, 0.2)}">${echapper(opts.type)} ${echapper(opts.numero)}</div>
        <div style="font-size:9.6px;color:#4b5563;font-style:italic;margin-top:2px">${echapper(opts.lieu || id.ville || 'Dakar')}, le ${dateFr(new Date())}</div>
      </td>
    </tr>
  </table>
  ${doubleFilet(id.couleur)}
  <div style="height:15px"></div>`;
}

export function enTeteFinancier(id: Identite, opts: { type: string; piece: string; echeance?: string }): string {
  return `
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="width:74px;vertical-align:middle;padding-right:13px">${blocLogo(id, 58)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:Georgia,serif;font-size:16.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase">${echapper(id.nom.toUpperCase())}</div>
        <div style="font-size:9px;color:#565f6b;margin-top:2.5px">Service facturation — ${echapper(id.adresse)}</div>
        ${id.identifiants.ninea ? `<div style="font-size:8.6px;color:#8a919c;margin-top:1.5px">NINEA ${echapper(id.identifiants.ninea)}</div>` : ''}
      </td>
      <td style="width:158px;vertical-align:top;text-align:right">
        <div style="border:1px solid ${nuance(id.couleur, 0.55)};border-top:3px solid ${id.couleur};border-radius:0 0 7px 7px;padding:8px 11px;display:inline-block;text-align:left;background:linear-gradient(180deg,${nuance(id.couleur, 0.94)} 0%,#ffffff 100%)">
          <div style="font-size:8px;text-transform:uppercase;letter-spacing:2px;color:#8a919c">N° de pièce</div>
          <div style="font-size:13.5px;font-weight:800;color:${assombrir(id.couleur, 0.25)};font-variant-numeric:tabular-nums;letter-spacing:.5px">${echapper(opts.piece)}</div>
          <div style="font-size:8px;color:#8a919c;margin-top:4px;border-top:0.7px solid ${nuance(id.couleur, 0.75)};padding-top:3.5px">Émis le ${dateCourte(new Date())}${opts.echeance ? '<br/>Échéance : <b>' + echapper(opts.echeance) + '</b>' : ''}</div>
        </div>
      </td>
    </tr>
  </table>
  ${doubleFilet(id.couleur)}
  <div style="height:13px"></div>`;
}

// --------------------------------------------------------------------
// SIGNATURES + CACHET — composition soignée (lieu/date, images, paraphe)
// --------------------------------------------------------------------

export function zoneSignature(id: Identite, opts: { qui?: string; mention?: string; largeur?: number; avecFaitLe?: boolean } = {}): string {
  const qui = opts.qui || id.nomDirection;
  return `
  <table style="width:${opts.largeur || 272}px;margin-left:auto;margin-top:30px;border-collapse:collapse">
    <tr>
      <td style="text-align:center">
        ${opts.avecFaitLe !== false ? `<div style="font-size:9.6px;color:#4b5563;margin-bottom:2px">Fait à ${echapper(id.ville || '……………')}, le ${dateFr(new Date())}</div>` : ''}
        <div style="position:relative;width:208px;height:76px;margin:6px auto 0">
          ${id.signature ? `<img src="${echapper(id.signature)}" alt="signature" style="max-height:66px;max-width:196px;object-fit:contain;position:absolute;left:2px;top:2px" />` : ''}
          ${id.cachet ? `<img src="${echapper(id.cachet)}" alt="cachet" style="max-height:72px;max-width:112px;object-fit:contain;position:absolute;right:0;top:0;opacity:.92" />` : ''}
          ${!id.signature && !id.cachet ? `<div style="border:1.1px dashed #b3bac4;border-radius:8px;height:70px;display:flex;align-items:center;justify-content:center;color:#a2aab5;font-size:8.8px;text-align:center;line-height:1.5">Signature et cachet<br/>de l'établissement</div>` : ''}
        </div>
        <div style="width:208px;margin:3px auto 0;border-top:1px solid #374151"></div>
        <div style="font-size:10.4px;font-weight:700;margin-top:4px;letter-spacing:.3px">${echapper(qui)}</div>
        ${opts.mention ? `<div style="font-size:8.4px;color:#77808b;margin-top:1px">${echapper(opts.mention)}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

export function doubleSignature(id: Identite | null, gauche: { qui: string; mention?: string }, droite?: { qui: string; mention?: string }): string {
  const cell = (s: { qui: string; mention?: string }, img?: string | null) => `
    <td style="width:50%;text-align:center;padding-top:28px;vertical-align:bottom">
      <div style="height:64px;position:relative">${img ? `<img src="${echapper(img)}" style="max-height:62px;max-width:152px;object-fit:contain" />` : '<div style="height:62px"></div>'}</div>
      <div style="width:172px;margin:4px auto 0;border-top:1px solid #374151"></div>
      <div style="font-size:10px;font-weight:700;margin-top:4px">${echapper(s.qui)}</div>
      ${s.mention ? `<div style="font-size:8.3px;color:#77808b;margin-top:1px">${echapper(s.mention)}</div>` : ''}
    </td>`;
  const sig = id?.signature ?? null;
  const quiD = droite ?? { qui: id?.nomDirection ?? 'La Direction', mention: 'Cachet et signature' };
  return `<table style="width:100%;border-collapse:collapse;margin-top:32px"><tr>${cell(gauche)}${cell(quiD, sig)}</tr></table>`;
}

// --------------------------------------------------------------------
// PIED DE PAGE — 3 zones, petites capitales, filet inverse
// --------------------------------------------------------------------

export function piedDePage(id: Identite, opts: { ref?: string; confidentiel?: boolean; page?: boolean } = {}): string {
  const mentions = [
    id.identifiants.ninea ? `NINEA ${id.identifiants.ninea}` : '',
    id.identifiants.autorisation ? `Autorisation n° ${id.identifiants.autorisation}` : '',
    id.identifiants.affiliation ? id.identifiants.affiliation : '',
  ].filter(Boolean);
  return `
  <div style="margin-top:auto;padding-top:20px">
    ${opts.confidentiel ? `<div style="text-align:center;margin-bottom:7px"><span style="border:1.4px solid #b91c1c;color:#b91c1c;font-size:8.4px;font-weight:800;letter-spacing:3px;padding:3.5px 16px;border-radius:3px;text-transform:uppercase">Confidentiel — Diffusion restreinte</span></div>` : ''}
    <div style="border-top:0.8px solid ${nuance(id.couleur, 0.35)}"></div>
    <div style="border-top:2.4px solid ${id.couleur};margin-top:1.6px"></div>
    <table style="width:100%;border-collapse:collapse;font-size:7.4px;color:#77808b;margin-top:6px">
      <tr>
        <td style="width:36%;vertical-align:top;line-height:1.65">
          <div style="font-weight:800;color:#4b5563;letter-spacing:1.2px;text-transform:uppercase;font-size:7.2px">${echapper(id.nom)}</div>
          <div>${echapper(id.adresse)}</div>
          <div>${[id.telephone, id.email].filter(Boolean).map(echapper).join(' · ')}</div>
        </td>
        <td style="width:30%;text-align:center;vertical-align:top;line-height:1.65">
          ${mentions.length ? mentions.map((m) => `<div>${echapper(m)}</div>`).join('') : `<div>Établissement d'enseignement privé</div>`}
        </td>
        <td style="width:34%;text-align:right;vertical-align:top;line-height:1.65">
          <div style="letter-spacing:.6px">Document généré par <b>ScolaGestion</b></div>
          <div>Réf. <b style="font-variant-numeric:tabular-nums">${echapper(opts.ref || '—')}</b>${opts.page ? ' · Page <span class="num-page"></span>' : ''}</div>
          <div>${echapper(id.siteWeb)}</div>
        </td>
      </tr>
    </table>
  </div>`;
}

// --------------------------------------------------------------------
// PAGE COMPLÈTE — composition typographique de prestige
// --------------------------------------------------------------------

export function pageHtml(opts: {
  identite: Identite;
  entete: string;
  titre?: string;
  corps: string;
  pied: string;
  autoImprimer?: boolean;
  filigrane?: string;
}): string {
  const c = opts.identite.couleur;
  const cFonce = assombrir(c, 0.28);
  const cT96 = nuance(c, 0.96);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${echapper(opts.titre || 'Document')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4; margin: 13mm 12.5mm 15mm 12.5mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html { font-feature-settings: "liga" 1, "kern" 1; }
  body { font-family:'Segoe UI',Inter,'Helvetica Neue',Arial,sans-serif;font-size:10.4pt;line-height:1.58;color:#1f2429;margin:0;display:flex;flex-direction:column;min-height:100vh;text-rendering:optimizeLegibility }
  .feuille { display:flex;flex-direction:column;min-height:calc(100vh - 18px);position:relative }
  .filigrane { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0 }
  .filigrane span { font-family:Georgia,serif;font-size:86pt;font-weight:800;color:rgba(31,36,41,0.045);transform:rotate(-28deg);letter-spacing:6px;white-space:nowrap;text-transform:uppercase }
  .contenu { position:relative;z-index:1;display:flex;flex-direction:column;flex:1 }

  /* ── Titre de document ── */
  h2.titre-doc { font-family:'Playfair Display',Georgia,serif;text-align:center;font-size:16.5pt;font-weight:800;letter-spacing:5px;text-transform:uppercase;margin:4px 0 3px;color:#111418 }
  .sous-titre-doc { text-align:center;font-size:9.8pt;color:#565f6b;margin-bottom:16px;font-style:italic }
  .filet-titre { width:210px;margin:7px auto 0;border-top:1px solid #9aa2ac }
  .filet-titre::after { content:'';display:block;width:46px;margin:2.5px auto 0;border-top:2.2px solid ${c} }

  /* ── Sections ── */
  .section-titre { font-family:Georgia,serif;font-size:11pt;font-weight:800;color:${cFonce};margin:18px 0 8px;text-transform:uppercase;letter-spacing:1.6px;display:flex;align-items:center;gap:10px }
  .section-titre::before { content:'';width:22px;border-top:2.2px solid ${c};flex:none }
  .section-titre::after { content:'';flex:1;border-top:0.7px solid ${nuance(c, 0.55)} }

  /* ── Tables de données ── */
  table.data { width:100%;border-collapse:separate;border-spacing:0;margin:9px 0 }
  table.data th { background:${c};color:#fff;font-size:8.2pt;padding:7px 9px;text-align:left;text-transform:uppercase;letter-spacing:1.4px;font-weight:700 }
  table.data th:first-child { border-radius:6px 0 0 0 }
  table.data th:last-child { border-radius:0 6px 0 0 }
  table.data td { border-bottom:0.8px solid ${nuance(c, 0.82)};padding:6px 9px;font-size:9.5pt;vertical-align:top }
  table.data tr:nth-child(even) td { background:${cT96} }
  table.data tbody tr:last-child td { border-bottom:1.4px solid ${nuance(c, 0.4)} }
  table.data thead { display:table-header-group }

  /* ── Cadres ── */
  .cadre { border:1px solid ${nuance(c, 0.55)};border-left:3.5px solid ${c};border-radius:0 7px 7px 0;padding:11px 15px;margin:11px 0;background:${cT96} }
  .cadre-rouge { border:1.3px solid #dc8484;border-left:3.5px solid #b91c1c;border-radius:0 7px 7px 0;padding:9px 13px;margin:9px 0;color:#7f1d1d;background:#fef4f4 }

  /* ── Champs & totaux ── */
  .champ { display:inline-block;margin:2.5px 20px 2.5px 0;font-size:10.1pt }
  .champ b { color:#374151;font-weight:700 }
  .total-encadre { border:1.4px solid ${c};border-left:6px solid ${c};border-radius:0 8px 8px 0;padding:11px 18px;display:flex;justify-content:space-between;font-size:12pt;font-weight:800;color:${cFonce};background:linear-gradient(90deg,${nuance(c, 0.9)} 0%,#ffffff 70%);letter-spacing:.3px }
  .mention-legale { font-size:8.5pt;color:#68717c;font-style:italic;margin-top:12px;line-height:1.6;border-top:0.7px solid #d4d9df;padding-top:7px }

  /* ── Points de complétion ── */
  .points { border-bottom:1px dotted #9aa2ac;min-width:180px;display:inline-block }

  /* ── Divers ── */
  .eviter-coupure { page-break-inside:avoid;break-inside:avoid }
  @media print { .no-print { display:none } body { min-height:auto } tr,td,th { page-break-inside:avoid } }
</style>
</head>
<body>
<div class="feuille">
  ${opts.filigrane ? `<div class="filigrane"><span>${echapper(opts.filigrane)}</span></div>` : ''}
  <div class="contenu">
    ${opts.entete}
    ${opts.titre ? `<h2 class="titre-doc">${echapper(opts.titre)}</h2><div class="filet-titre"></div>` : ''}
    <div style="flex:1">${opts.corps}</div>
    ${opts.pied}
  </div>
</div>
${opts.autoImprimer ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},380)})</script>` : ''}
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
  <table style="width:100%;border-collapse:collapse;margin-bottom:13px">
    <tr>
      ${el.photo ? `<td style="width:86px"><img src="${echapper(el.photo)}" style="height:84px;width:70px;object-fit:cover;border:1px solid #cfd5db;border-radius:6px"/></td>` : ''}
      <td style="vertical-align:middle;padding:5px 0 5px ${el.photo ? '13px' : '0'}">
        <div style="font-family:Georgia,serif;font-size:14.5pt;font-weight:800;letter-spacing:.4px">${echapper(el.prenom)} ${echapper(String(el.nom).toUpperCase())}</div>
        <div style="width:120px;border-top:1.6px solid #374151;margin:4px 0 6px"></div>
        <div>
          <span class="champ"><b>Matricule</b> ${echapper(el.matricule || '—')}</span>
          <span class="champ"><b>Né(e) le</b> ${dateFr(el.dateNaissance)}${el.lieuNaissance ? ' à ' + echapper(el.lieuNaissance) : ''}</span>
          <span class="champ"><b>Classe</b> ${echapper(el.classe?.libelle || '—')}</span>
          ${el.regime ? `<span class="champ"><b>Régime</b> ${echapper(el.regime)}</span>` : ''}
        </div>
        ${lignesExtra ? `<div style="margin-top:3px">${lignesExtra}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

export function mentionPiedClassique(): string {
  return `<div class="mention-legale">En foi de quoi, le présent document est délivré à l'intéressé(e) pour servir et valoir ce que de droit.</div>`;
}

// --------------------------------------------------------------------
// Composants d'apparat (diplômes, attestations solennelles)
// --------------------------------------------------------------------

/** Cadre ornemental de diplôme : double bordure + équerres d'angle. */
export function cadreDiplome(id: Identite, contenuHtml: string): string {
  const c = id.couleur;
  return `
  <div style="position:relative;border:2.6px solid ${c};border-radius:10px;padding:26px 30px;margin:10px 0 4px;background:linear-gradient(160deg,${nuance(c, 0.985)} 0%,#ffffff 45%,${nuance(c, 0.985)} 100%)">
    <div style="position:absolute;inset:5px;border:0.9px solid ${nuance(c, 0.45)};border-radius:7px;pointer-events:none"></div>
    <div style="position:absolute;top:14px;left:14px;width:26px;height:26px;border-top:2.6px solid ${c};border-left:2.6px solid ${c};border-radius:4px 0 0 0"></div>
    <div style="position:absolute;top:14px;right:14px;width:26px;height:26px;border-top:2.6px solid ${c};border-right:2.6px solid ${c};border-radius:0 4px 0 0"></div>
    <div style="position:absolute;bottom:14px;left:14px;width:26px;height:26px;border-bottom:2.6px solid ${c};border-left:2.6px solid ${c};border-radius:0 0 0 4px"></div>
    <div style="position:absolute;bottom:14px;right:14px;width:26px;height:26px;border-bottom:2.6px solid ${c};border-right:2.6px solid ${c};border-radius:0 0 4px 0"></div>
    ${contenuHtml}
  </div>`;
}

/** Bandeau de statistiques (bulletins) : moyennes / rang / mention. */
export function bandeauStats(id: Identite, stats: Array<{ libelle: string; valeur: string; accent?: boolean }>): string {
  const c = id.couleur;
  return `
  <table style="width:100%;border-collapse:collapse;margin:13px 0;border-top:1.4px solid ${nuance(c, 0.35)};border-bottom:1.4px solid ${nuance(c, 0.35)}">
    <tr>
      ${stats.map((s, i) => `
      <td style="text-align:center;padding:11px 8px;${i > 0 ? `border-left:0.8px solid ${nuance(c, 0.6)};` : ''}width:${Math.floor(100 / stats.length)}%">
        <div style="font-size:7.6pt;text-transform:uppercase;letter-spacing:2px;color:#77808b;font-weight:700">${echapper(s.libelle)}</div>
        <div style="font-family:Georgia,serif;font-size:${s.accent ? '16' : '14'}pt;font-weight:800;color:${s.accent ? assombrir(c, 0.15) : '#1f2429'};margin-top:3px">${s.valeur}</div>
      </td>`).join('')}
    </tr>
  </table>`;
}
