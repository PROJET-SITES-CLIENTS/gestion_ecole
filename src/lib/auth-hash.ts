// ====================================================================
// HASH DE MOT DE PASSE — module PUR (node:crypto uniquement).
// Séparé de auth.ts (qui dépend de next/headers) pour rester importable
// par les scripts de test et la couche métier sans contexte Next.
// ====================================================================

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const N = 16384, r = 8, p = 1;
  const hash = scryptSync(password, salt, 64, { N, r, p }).toString('hex');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts[0] !== 'scrypt' || parts.length !== 6) return false;
    const [, N, r, p, salt, hash] = parts;
    const calc = scryptSync(password, salt, 64, { N: Number(N), r: Number(r), p: Number(p) });
    const attendu = Buffer.from(hash, 'hex');
    return calc.length === attendu.length && timingSafeEqual(calc, attendu);
  } catch {
    return false;
  }
}

/** Génère un mot de passe aléatoire lisible (onboarding, comptes temporaires). */
export function genererMotDePasse(longueur = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const octets = randomBytes(longueur);
  let out = '';
  for (let i = 0; i < longueur; i++) out += alphabet[octets[i] % alphabet.length];
  return out;
}

/** Génère 10 codes de secours 2FA (affichés UNE fois, stockés hashés). */
export function genererCodesSecours(): string[] {
  return Array.from({ length: 10 }, () =>
    randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-'),
  );
}

const ALPHABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Génère un secret TOTP base32 (20 octets → 32 caractères). */
export function genererSecretTotp(): string {
  const octets = randomBytes(20);
  let bits = '';
  for (const o of octets) bits += o.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += ALPHABET_BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
