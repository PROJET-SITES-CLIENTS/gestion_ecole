// E2E RH+ : formations, sanctions, acquisition soldes idempotente.
import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { creerFormationCore, majFormationCore, sanctionnerPersonnelCore, acquitterSoldesCongesCore } from '../src/lib/business';
import { executerAvecRetry, dbTest } from './_helper-test';
const db: PrismaClient = dbTest as unknown as PrismaClient;
let p = 0, f = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${n}${d ? ` (${d})` : ''}`); ok ? p++ : f++; };
const refus = async (fn: any, n: string, frag: string) => { try { await fn(); check(n, false, 'accepté !'); } catch (e: any) { check(n, String(e.message).toLowerCase().includes(frag), String(e.message).slice(0, 60)); } };

async function main() {
  const S = Date.now().toString(36);
  const r = await initialiserEcoleCore({ nomEcole: `École RH ${S}`, adminNom: 'T', adminPrenom: 'Dir', adminEmail: `rh-${S}@local.test`, adminMotDePasse: 'MotDePasse123!' });
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['rh.gerer', 'admin.saas']) };
  await db.personnel.update({ where: { id: (await db.personnel.findFirst({ where: { utilisateurId: r.adminId } }))!.id }, data: { dateEmbauche: new Date(Date.now() - 130 * 86400000) } });
  const eid = r.ecoleId;
  const pers = (await db.personnel.findFirst({ where: { utilisateurId: r.adminId } }))!;

  // ── Formations ──
  const fo = await creerFormationCore(ctx, { personnelId: pers.id, intitule: 'Secourisme scolaire', organisme: 'Croix-Rouge', dateDebut: new Date(), cout: 50000 });
  check('formation planifiée', !!fo.formationId);
  await majFormationCore(ctx, fo.formationId, 'en_cours');
  await majFormationCore(ctx, fo.formationId, 'terminee', true);
  const fApres = await db.formationPersonnel.findUnique({ where: { id: fo.formationId } });
  check('workflow formation → terminée + certificat', fApres?.statut === 'terminee' && fApres?.certificatObtenu === true);

  // ── Sanctions ──
  await refus(() => sanctionnerPersonnelCore(ctx, { personnelId: pers.id, dateFaits: new Date(), faute: 'x', typeSanction: 'expulsion', description: 'type invalide' }), 'type de sanction invalide refusé', 'invalide');
  const sa = await sanctionnerPersonnelCore(ctx, { personnelId: pers.id, dateFaits: new Date(), faute: 'Retards répétés', typeSanction: 'blame', description: 'Trois retards non justifiés ce mois' });
  const notif = await db.notification.findFirst({ where: { ecoleId: eid, sujet: { contains: 'Sanction' } } });
  check('sanction blâmée + notification écrite au salarié', !!sa.sanctionId && !!notif);

  // ── Soldes de congés : acquisition idempotente ──
  const a1 = await acquitterSoldesCongesCore(ctx, {});
  const a2 = await acquitterSoldesCongesCore(ctx, {});
  const solde = await db.soldeConge.findFirst({ where: { ecoleId: eid, personnelId: pers.id } });
  check('acquisition crédite les actifs', a1.credites >= 1 && (solde?.droitsAcquis ?? 0) > 0, `${solde?.droitsAcquis ?? 0} j`);
  check('IDEMPOTENTE : re-exécution ne double pas', a2.totalJours === 0, `2e passage +${a2.totalJours}`);

  // ── Nettoyage ──
  await db.formationPersonnel.deleteMany({ where: { ecoleId: eid } });
  await db.sanctionPersonnel.deleteMany({ where: { ecoleId: eid } });
  await db.soldeConge.deleteMany({ where: { ecoleId: eid } });
  await db.notification.deleteMany({ where: { ecoleId: eid } });
  const users = await db.utilisateur.findMany({ where: { email: { contains: `-${S}@local.test` } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length) { await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: ids } } }); await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: ids } } }); await db.personnel.deleteMany({ where: { utilisateurId: { in: ids } } }); await db.utilisateur.deleteMany({ where: { id: { in: ids } } }); }
  const roles = await db.role.findMany({ where: { ecoleId: eid }, select: { id: true } });
  if (roles.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roles.map((x) => x.id) } } });
  await db.role.deleteMany({ where: { ecoleId: eid } });
  await db.configurationPaie.deleteMany({ where: { ecoleId: eid } });
  await db.classe.deleteMany({ where: { ecoleId: eid } });
  await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: eid } } } });
  await db.section.deleteMany({ where: { cycle: { ecoleId: eid } } });
  await db.periode.deleteMany({ where: { ecoleId: eid } });
  await db.anneeScolaire.deleteMany({ where: { ecoleId: eid } });
  await db.cycle.deleteMany({ where: { ecoleId: eid } });
  await db.auditLog.deleteMany({ where: { ecoleId: eid } });
  await db.ecole.delete({ where: { id: eid } });
  console.log('✓ nettoyée');
  console.log(`\n${f === 0 ? '✅✅' : '⚠️'} RH COMPLÉMENTS : ${p}/${p + f} CHECKS PASS${f ? ` — ${f} ÉCHEC(S)` : ''}`);
  if (f) process.exitCode = 1;
}
executerAvecRetry('RH+', main);
