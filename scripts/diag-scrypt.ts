import { hashPassword, verifyPassword } from '../src/lib/auth-hash';
try {
  const h = hashPassword('Test123!');
  console.log('hashPassword OK :', h.slice(0, 30), '…');
  console.log('verifyPassword :', verifyPassword('Test123!', h));
} catch (e: any) {
  console.error('ÉCHEC scrypt :', e.code, e.message?.slice(0, 100));
}
