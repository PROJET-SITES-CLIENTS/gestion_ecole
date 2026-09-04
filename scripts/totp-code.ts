// Affiche le code TOTP courant pour le compte de démonstration direction@vinci.sn
// (secret SG_TOTP_SECRET_DEMO du seed). Usage : npx tsx scripts/totp-code.ts
import { createHmac } from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const secret = process.env.SG_TOTP_SECRET_DEMO || 'JBSWY3DPEHPK3PXP';

function base32Decode(s: string): Buffer {
  let bits = '';
  for (const c of s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')) {
    const idx = ALPHABET.indexOf(c);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const octets: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets);
}

function codeTotp(compteur: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(compteur / 2 ** 32), 0);
  buf.writeUInt32BE(compteur % 2 ** 32, 4);
  const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binaire =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binaire % 1_000_000).padStart(6, '0');
}

const pas = Math.floor(Date.now() / 30000);
const restant = 30 - (Math.floor(Date.now() / 1000) % 30);
console.log(`Code TOTP actuel (direction@vinci.sn) : ${codeTotp(pas)}  (valide encore ${restant}s)`);
