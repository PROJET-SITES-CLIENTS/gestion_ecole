// CORRECTION : assigner un rôle à tous les employés SANS rôle
import { PrismaClient } from '@prisma/client';
const db: any = new PrismaClient();
async function main() {
  const sansRole = await db.utilisateur.findMany({
    where: {
      type: 'personnel', actif: true, deletedAt: null,
      roles: { none: {} },
    },
    select: { id: true, email: true, nom: true, prenom: true, ecoleId: true },
  });
  console.log(`${sansRole.length} employé(s) sans rôle`);
  for (const u of sansRole) {
    // deviner le rôle : direction si c'est le premier compte, sinon enseignant
    const roleDirection = await db.role.findFirst({ where: { ecoleId: u.ecoleId, code: 'direction' } });
    const roleEnseignant = await db.role.findFirst({ where: { ecoleId: u.ecoleId, code: 'enseignant' } });
    // le premier utilisateur de l'école = direction (créé par initialiserEcoleCore)
    const tous = await db.utilisateur.findMany({ where: { ecoleId: u.ecoleId, type: 'personnel' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    const estPremier = tous[0]?.id === u.id;
    const role = estPremier && roleDirection ? roleDirection : roleEnseignant;
    if (role) {
      await db.utilisateurRole.create({ data: { utilisateurId: u.id, roleId: role.id } });
      console.log(`  ✓ ${u.prenom} ${u.nom} → ${estPremier ? 'direction' : 'enseignant'}`);
    } else {
      console.log(`  ⚠ ${u.prenom} ${u.nom} : aucun rôle disponible`);
    }
  }
}
main().catch(console.error).finally(() => db.$disconnect());
