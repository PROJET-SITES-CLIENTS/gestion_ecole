// Restaure typeContrat/salaireBrut du personnel Vinci (valeurs du seed,
// perdues lors de la migration ContratPersonnel).
import { PrismaClient } from '@prisma/client';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();
async function main() {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  const pers = await avecRetryBdd(() => db.personnel.findMany({
    where: { ecoleId: vinci!.id },
    include: { utilisateur: { include: { roles: { include: { role: true } } } } },
    orderBy: { createdAt: 'asc' },
  }), 3, 500);
  console.log(`${pers.length} personnels à restaurer`);
  // Règles du seed : direction 350 000 F (CDI) ; enseignants selon matière ;
  // le premier bulletin de paie (280 000 F) correspond à enseignants[0].
  for (const p of pers) {
    const roles = p.utilisateur?.roles.map((r) => r.role.code) ?? [];
    let salaire: number | null = null; let contrat = 'CDI';
    if (roles.includes('direction')) { salaire = 35000000; }
    else if (roles.includes('comptabilite')) { salaire = 28000000; contrat = 'CDD'; }
    else if (roles.includes('rh')) { salaire = 32000000; }
    else if (roles.includes('infirmier')) { salaire = 23000000; contrat = 'CDD'; }
    else if (roles.includes('surveillant')) { salaire = 22000000; contrat = 'CDD'; }
    else if (roles.includes('censeur')) { salaire = 34000000; }
    else if (roles.includes('enseignant')) { salaire = 35000000; }
    else if (roles.includes('secretariat')) { salaire = 24000000; }
    else if (roles.includes('assistant_direction')) { salaire = 30000000; }
    else if (p.matricule?.startsWith('ENS-')) { salaire = 35000000; } // enseignants du seed
    else { contrat = 'CDI'; }
    await avecRetryBdd(() => db.personnel.update({
      where: { id: p.id },
      data: { typeContrat: p.typeContrat ?? contrat, salaireBrut: p.salaireBrut ?? salaire },
    }), 3, 500);
  }
  const verif = await avecRetryBdd(() => db.personnel.findMany({ where: { ecoleId: vinci!.id }, select: { nom: true, typeContrat: true, salaireBrut: true } }), 3, 500);
  verif.forEach((v) => console.log(`  ${v.nom} : ${v.typeContrat} · ${(v.salaireBrut ?? 0) / 100} F`));
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
