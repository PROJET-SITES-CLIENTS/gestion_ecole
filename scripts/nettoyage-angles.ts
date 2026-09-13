// Supprime TOUS les résidus des suites de tests (utilisateurs marqués,
// sessions de test) pour les rendre rejouables après un crash.
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();
const PREFIXES = ['anglesmorts', 'e2e-', 'rendu-', 'repro-', 'test-init-'];
async function main() {
  await avecRetryBdd(async () => {
    // 1. Utilisateurs de test
    const residus = await db.utilisateur.findMany({
      where: { OR: [{ email: { startsWith: 'anglesmorts' } }, { nom: { contains: 'AnglesMorts' } }] },
      select: { id: true, email: true },
    });
    if (residus.length) {
      const ids = residus.map((r) => r.id);
      console.log('Utilisateurs résiduels :', residus.map((r) => r.email).join(', '));
      await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.tentativeConnexion.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.twoFactorMethod.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.twoFactorBackupCode.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.jetonAuth.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.notification.deleteMany({ where: { destinataireId: { in: ids } } });
      await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.personnel.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.utilisateur.deleteMany({ where: { id: { in: ids } } });
      console.log('✓ supprimés');
    } else console.log('Aucun utilisateur résiduel');
    // 2. Sessions de test (token dérivé du mark « AnglesMorts-s »)
    const h = createHash('sha256').update('AnglesMorts-s').digest('hex');
    const v = await db.sessionUtilisateur.deleteMany({ where: { tokenHash: h } });
    if (v.count) console.log('✓ session test supprimée');
  }, 3, 500);
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
