// Nettoie les écoles de test créées par les scripts (jamais les vraies)
import { PrismaClient } from '@prisma/client';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();

async function main() {
  const ecoles = await db.ecole.findMany({
    where: { OR: [
      { nom: { startsWith: 'École Vide Repro' } },
      { nom: { startsWith: 'École Vide Rendu' } },
      { nom: { startsWith: 'École Test Init' } },
    ] },
    select: { id: true, nom: true, slug: true },
  });
  console.log('Écoles de test trouvées :', ecoles.map((e) => e.nom).join(', ') || 'aucune');
  for (const e of ecoles) {
    await avecRetryBdd(async () => {
      const utilisateurs = await db.utilisateur.findMany({ where: { ecoleId: e.id }, select: { id: true } });
      const uids = utilisateurs.map((u) => u.id);
      if (uids.length) {
        await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: uids } } });
        await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: uids } } });
        await db.personnel.deleteMany({ where: { utilisateurId: { in: uids } } });
        await db.notification.deleteMany({ where: { destinataireId: { in: uids } } });
        await db.utilisateur.deleteMany({ where: { id: { in: uids } } });
      }
      const roleIds = await db.role.findMany({ where: { ecoleId: e.id }, select: { id: true } });
      if (roleIds.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roleIds.map((x) => x.id) } } });
      await db.role.deleteMany({ where: { ecoleId: e.id } });
      await db.configurationPaie.deleteMany({ where: { ecoleId: e.id } });
      await db.classe.deleteMany({ where: { ecoleId: e.id } });
      await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: e.id } } } });
      await db.section.deleteMany({ where: { cycle: { ecoleId: e.id } } });
      await db.periode.deleteMany({ where: { ecoleId: e.id } });
      await db.anneeScolaire.deleteMany({ where: { ecoleId: e.id } });
      await db.cycle.deleteMany({ where: { ecoleId: e.id } });
      await db.auditLog.deleteMany({ where: { ecoleId: e.id } });
      await db.notification.deleteMany({ where: { ecoleId: e.id } });
      await db.ecole.delete({ where: { id: e.id } });
    }, 4, 600);
    console.log('✓ supprimée :', e.nom);
  }
  const restantes = await db.ecole.findMany({ select: { nom: true, slug: true }, orderBy: { nom: 'asc' } });
  console.log('Écoles restantes :', restantes.map((e) => e.nom).join(' | '));
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
