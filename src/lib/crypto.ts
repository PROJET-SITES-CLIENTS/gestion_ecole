// ====================================================================
// CRYPTOGRAPHIE DES DONNÉES SENSIBLES (E3)
// Chiffrement au repos AES-256-GCM des champs médicaux (FicheSante).
// Clé : variable d'environnement SG_CLE_CHIFFREMENT (32 octets hex/base64
// ou phrase). Sans clé : stockage en clair + avertissement (jamais de
// fausse sécurité silencieuse). Le préfixe « enc:v1: » marque les valeurs
// chiffrées — rétrocompatible avec les données existantes.
// ====================================================================

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

let cléCache: Buffer | null | undefined;

function clé(): Buffer | null {
  if (cléCache !== undefined) return cléCache;
  const brute = process.env.SG_CLE_CHIFFREMENT;
  if (!brute || brute.length < 16) {
    cléCache = null;
    return null;
  }
  // 32 octets dérivés de la valeur fournie (hex 64 chars → direct)
  cléCache = /^[0-9a-f]{64}$/i.test(brute)
    ? Buffer.from(brute, 'hex')
    : createHash('sha256').update(brute).digest();
  return cléCache;
}

export function chiffrementDisponible(): boolean {
  return clé() !== null;
}

/** Chiffre une valeur ; retourne « enc:v1:iv:ct » ou la valeur claire si pas de clé. */
export function chiffrer(clair: string | null | undefined): string | null {
  if (clair === null || clair === undefined || clair === '') return clair ?? null;
  if (clair.startsWith('enc:v1:')) return clair; // déjà chiffrée
  const k = clé();
  if (!k) return clair; // honnête : sans clé, pas de faux chiffrement
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([cipher.update(clair, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${ct.toString('base64')}:${tag.toString('base64')}`;
}

/** Déchiffre « enc:v1:… » (ou retourne la valeur claire telle quelle). */
export function déchiffrer(valeur: string | null | undefined): string | null {
  if (!valeur || !valeur.startsWith('enc:v1:')) return valeur ?? null;
  const k = clé();
  if (!k) return '🔒 (chiffrée — clé absente)';
  try {
    const [, , ivB64, ctB64, tagB64] = valeur.split(':');
    const decipher = createDecipheriv('aes-256-gcm', k, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '🔒 (chiffrée — illisible avec la clé actuelle)';
  }
}
