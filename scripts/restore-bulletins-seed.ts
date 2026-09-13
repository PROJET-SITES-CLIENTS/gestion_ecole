// Restaure les 3 bulletins de démo du seed (Sixième A, T1) supprimés
// par erreur lors du nettoyage des résidus T18.
import { PrismaClient } from '@prisma/client';
import { avecRetryBdd } from '../src/lib/retry-bdd';
const db = new PrismaClient();

async function main() {
  const vinci = await avecRetryBdd(() => db.ecole.findFirst({ where: { slug: 'vinci' } }), 3, 500);
  const classe6A = await avecRetryBdd(() => db.classe.findFirst({ where: { ecoleId: vinci!.id, libelle: { contains: 'Sixième A' } } }), 3, 500);
  const annee = await avecRetryBdd(() => db.anneeScolaire.findFirst({ where: { ecoleId: vinci!.id, active: true } }), 3, 500);
  const periodeT1 = await avecRetryBdd(() => db.periode.findFirst({ where: { ecoleId: vinci!.id, anneeScolaireId: annee!.id, code: 'T1' } }), 3, 500);
  const eleves = await avecRetryBdd(() => db.eleve.findMany({ where: { classeActuelleId: classe6A!.id, statut: 'actif' }, orderBy: { createdAt: 'asc' } }), 3, 500);
  const dir = await avecRetryBdd(() => db.utilisateur.findFirst({ where: { ecoleId: vinci!.id, email: 'direction@vinci.sn' } }), 3, 500);
  const enseignant = await avecRetryBdd(() => db.personnel.findFirst({ where: { ecoleId: vinci!.id, roles: { some: { role: { code: 'enseignant' } } } }, include: { utilisateur: true }, orderBy: { createdAt: 'asc' } }), 3, 500);
  const creeParId = enseignant?.utilisateurId ?? dir!.id;

  const existants = await avecRetryBdd(() => db.bulletin.findMany({ where: { eleveId: { in: eleves.slice(0, 3).map((e) => e.id) }, periodeId: periodeT1!.id } }), 3, 500);
  if (existants.length > 0) { console.log('Des bulletins existent déjà pour ces élèves — rien à faire.'); return; }

  const D = [
    { statut: 'publie', moyennes: JSON.stringify({ MATHS: 14.5, FR: 13.0, HG: 15.5 }), moyenneGenerale: 14.3, rang: 2, appreciation: 'Trimestre solide, continue ainsi !', decision: 'admis', publie: true },
    { statut: 'valide_pp', moyennes: JSON.stringify({ MATHS: 11.0, FR: 16.5, HG: 12.0 }), moyenneGenerale: 13.2, rang: 4, appreciation: 'Bon trimestre en français.', decision: null, publie: false },
    { statut: 'en_construction', moyennes: JSON.stringify({ MATHS: 9.5, FR: 10.5, HG: 11.0 }), moyenneGenerale: null, rang: null, appreciation: null, decision: null, publie: false },
  ];
  for (let i = 0; i < 3; i++) {
    await avecRetryBdd(() => db.bulletin.create({ data: {
      eleveId: eleves[i].id, classeId: classe6A!.id, periodeId: periodeT1!.id, version: 1,
      statut: D[i].statut, moyennes: D[i].moyennes, moyenneGenerale: D[i].moyenneGenerale,
      rang: D[i].rang, appreciationGenerale: D[i].appreciation, decisionConseil: D[i].decision,
      creeParId,
      ...(D[i].statut !== 'en_construction' ? { dateValidationPp: new Date('2026-12-10'), validePpParId: dir!.id } : {}),
      ...(D[i].publie ? { dateValidationDirection: new Date('2026-12-12'), valideDirectionParId: dir!.id, datePublication: new Date('2026-12-13') } : {}),
    } }), 3, 500);
  }
  console.log('✓ 3 bulletins de démo restaurés pour Sixième A / T1');
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exit(1); }).finally(() => db.$disconnect());
