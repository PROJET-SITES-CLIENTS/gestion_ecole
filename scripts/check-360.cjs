const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const classes = await db.classe.findMany({ select: { id: true, code: true, enseignantPrincipalId: true, niveauId: true } });
  const avecTit = classes.filter(c => c.enseignantPrincipalId).length;
  console.log('classes:', classes.length, '| avec titulaire:', avecTit);
  const pr = await db.personnelRole.count();
  const prDetail = await db.personnelRole.findMany({ select: { personnelId: true, matiereId: true, classeId: true, roleId: true, dateFin: true } });
  console.log('personnelRoles:', pr, '| actifs (sans dateFin):', prDetail.filter(x => !x.dateFin).length, '| avec matiereId:', prDetail.filter(x => x.matiereId).length);
  const niv = await db.niveau.findMany({ include: { section: { include: { cycle: true } } }, select: { id: true, libelle: true, section: true } }).catch(async () => {
    return db.niveau.findMany({ include: { section: { include: { cycle: true } } } });
  });
  console.log('niveaux:', niv.length, '| avec cycle:', niv.filter(n => n.section?.cycle).length, '| cycles:', [...new Set(niv.map(n => n.section?.cycle?.libelle).filter(Boolean))].join(' / '));
  const av = await db.avancementProgramme.count();
  const seances = await db.seance.count();
  const cong = await db.conge.count();
  const bp = await db.bulletinPaie.count();
  const ex = await db.examenOfficiel.count();
  const bud = await db.budget.count({ include: { lignes: true } }).catch(() => db.budget.count());
  console.log('avancements:', av, '| seances:', seances, '| conges:', cong, '| bulletinsPaie:', bp, '| examens:', ex, '| budgets:', bud);
  const bul = await db.bulletin.count({ where: { moyenneGenerale: { not: null } } });
  console.log('bulletins avec moyenne:', bul);
  await db.$disconnect();
})();
