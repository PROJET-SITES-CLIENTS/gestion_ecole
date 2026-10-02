/**
 * TEST — MOTEUR DE RYTHME PÉDAGOGIQUE (audit enseignant)
 * Valide la chaîne complète : cahier de textes ↔ chapitre ↔ avancement
 * automatique ↔ rythme attendu/réalisé.
 *   R1  entrée de cahier rattachée à un chapitre
 *   R2  « chapitre terminé » → avancement 100 % SANS re-saisie
 *   R3  rythme calculé : attendu réaliste, statut cohérent, tri des retards
 *   R4  chapitre de période échue non complété → signalé en retard
 * Exécution : npx tsx scripts/test-rythme.ts
 */
import { Ctx, creerEntreeCahierCore } from '../src/lib/business';
import { rythmeProgrammesCore, evaluerRythmeProgrammeCore } from '../src/lib/business/rythme';
import { dbTest as db } from './_helper-test';

const MARK = 'RYTH';
const results: Array<{ n: string; ok: boolean; d: string }> = [];
const check = (n: string, ok: boolean, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };

async function main() {
  const ecole = await db.ecole.findFirst();
  if (!ecole) throw new Error('Aucune école');
  const dir = await db.utilisateur.findFirst({ where: { ecoleId: ecole.id } });
  if (!dir) throw new Error('Aucun utilisateur');
  const perms = await db.permission.findMany({ select: { code: true } });
  const ctx: Ctx = { utilisateurId: dir.id, ecoleId: ecole.id, type: 'personnel', permissions: new Set(perms.map((p) => p.code)) };

  // Nettoyage préalable
  await db.entreeCahierTexte.deleteMany({ where: { chapitre: { programme: { titre: { startsWith: MARK } } } } });
  await db.cahierTexte.deleteMany({ where: { ecoleId: ecole.id, classe: { code: { startsWith: MARK } } } });
  await db.avancementProgramme.deleteMany({ where: { chapitre: { programme: { titre: { startsWith: MARK } } } } });
  await db.programme.deleteMany({ where: { ecoleId: ecole.id, titre: { startsWith: MARK } } });
  await db.classe.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.matiere.deleteMany({ where: { ecoleId: ecole.id, code: { startsWith: MARK } } });
  await db.personnel.deleteMany({ where: { ecoleId: ecole.id, nom: `${MARK}Prof` } });

  const annee = await db.anneeScolaire.findFirst({ where: { ecoleId: ecole.id, active: true } });
  const niveau = await db.niveau.findFirst({ where: { section: { cycle: { ecoleId: ecole.id } } } });
  if (!annee || !niveau) throw new Error('Structure incomplète');

  // Période ÉCHUE : créée avec des dates révolues (moteur = comparaison de dates)
  const periodes = await db.periode.findMany({ where: { ecoleId: ecole.id, anneeScolaireId: annee.id }, orderBy: { dateDebut: 'asc' } });
  const periodePasse = await db.periode.create({
    data: { ecoleId: ecole.id, anneeScolaireId: annee.id, libelle: `${MARK} T0 passé`, code: `${MARK}T0`, dateDebut: new Date(Date.now() - 120 * 86400000), dateFin: new Date(Date.now() - 60 * 86400000), typeBulletin: 'college_lycee' },
  });
  const periodeActuelle = periodes.find((p) => new Date() >= p.dateDebut && new Date() <= p.dateFin) ?? periodes[periodes.length - 1];

  const prof = (await db.personnel.findFirst({ where: { utilisateurId: dir.id, deletedAt: null } }))
    ?? await db.personnel.create({ data: { ecoleId: ecole.id, nom: `${MARK}Prof`, prenom: 'Test', matricule: `${MARK}-P1`, dateEmbauche: new Date(), statut: 'actif', utilisateurId: dir.id } });
  const profCree = prof.nom === `${MARK}Prof`;
  const classe = await db.classe.create({ data: { ecoleId: ecole.id, anneeScolaireId: annee.id, niveauId: niveau.id, code: `${MARK}C`, libelle: `${MARK} Classe`, capaciteMax: 30 } });
  const mat = await db.matiere.create({ data: { ecoleId: ecole.id, code: `${MARK}M`, libelle: `${MARK} Science`, coefficient: 2 } });
  const prog = await db.programme.create({ data: { ecoleId: ecole.id, matiereId: mat.id, niveauId: niveau.id, anneeScolaireId: annee.id, titre: `${MARK} Programme` } });
  const chPasse = await db.chapitre.create({ data: { programmeId: prog.id, titre: `${MARK} Ch passé`, ordre: 1, periodeId: periodePasse.id } });
  const chActuel = await db.chapitre.create({ data: { programmeId: prog.id, titre: `${MARK} Ch actuel`, ordre: 2, periodeId: periodeActuelle.id } });

  // ═══ R1 — entrée rattachée au chapitre ═══
  const e1 = await creerEntreeCahierCore(ctx, {
    classeId: classe.id, matiereId: mat.id, dateCours: new Date(), contenu: 'Notions du jour',
    chapitreId: chActuel.id, publier: true,
  });
  const entree = await db.entreeCahierTexte.findUnique({ where: { id: e1.entreeId } });
  check('R1a entrée liée au chapitre du programme', entree?.chapitreId === chActuel.id);

  // ═══ R2 — chapitre terminé → avancement auto 100 % ═══
  const e2 = await creerEntreeCahierCore(ctx, {
    classeId: classe.id, matiereId: mat.id, dateCours: new Date(), contenu: 'Synthèse finale du chapitre passé',
    chapitreId: chPasse.id, chapitreTermine: true, publier: true,
  });
  const av = await db.avancementProgramme.findUnique({ where: { chapitreId_classeId: { chapitreId: chPasse.id, classeId: classe.id } } });
  check('R2a avancement 100 % créé automatiquement', av?.pourcentage === 100);
  check('R2b retour explicite de la mise à jour', e2.avancementMisAJour === true && e2.chapitre === `${MARK} Ch passé`);

  // ═══ R3 — rythme calculé ═══
  const rythmes = await evaluerRythmeProgrammeCore(ctx, prog.id);
  const r = rythmes.find((x) => x.classeId === classe.id);
  check('R3a rythme calculé pour la classe', Boolean(r));
  if (r) {
    // Attendu : le chapitre passé (période échue) = 100 % attendu ; le chapitre
    // actuel = progression temporelle dans sa période. Réalisé : 100 + 0.
    check('R3b chapitre échu complété → pas signalé en retard', !r.chapitresEnRetard.includes(`${MARK} Ch passé`), JSON.stringify(r.chapitresEnRetard));
    check('R3c réalisé = 50 % (1 chapitre sur 2 à 100 %)', r.pourcentageRealise === 50, `${r.pourcentageRealise}%`);
    check('R3d attendu plausible (≥ 50 %, période échue passée)', r.pourcentageAttendu >= 50 && r.pourcentageAttendu <= 100, `${r.pourcentageAttendu}%`);
    check('R3e statut cohérent', ['en_avance', 'a_l_heure', 'en_retard'].includes(r.statut), r.statut);
    check('R3f dernière entrée cahier reportée', Boolean(r.derniereEntreeCahier));
  }

  // ═══ R4 — chapitre d'une période échue NON complété → retard signalé ═══
  const chJamaisFait = await db.chapitre.create({ data: { programmeId: prog.id, titre: `${MARK} Ch jamais fait`, ordre: 3, periodeId: periodePasse.id } });
  const rythmes2 = await evaluerRythmeProgrammeCore(ctx, prog.id);
  const r2 = rythmes2.find((x) => x.classeId === classe.id);
  check('R4 chapitre de période échue non complété SIGNALÉ', r2?.chapitresEnRetard.includes(`${MARK} Ch jamais fait`) === true, JSON.stringify(r2?.chapitresEnRetard));

  // ═══ R5 — vue globale triée (les plus en retard d'abord) ═══
  const tous = await rythmeProgrammesCore(ctx);
  check('R5 vue globale triée par écart croissant', tous.length >= 1 && tous.every((x, i) => i === 0 || tous[i - 1].ecart <= x.ecart), `${tous.length} lignes`);

  // Nettoyage final
  await db.entreeCahierTexte.deleteMany({ where: { chapitre: { programmeId: prog.id } } });
  await db.cahierTexte.deleteMany({ where: { ecoleId: ecole.id, classeId: classe.id } });
  await db.avancementProgramme.deleteMany({ where: { chapitre: { programmeId: prog.id } } });
  await db.chapitre.deleteMany({ where: { programmeId: prog.id } });
  await db.programme.delete({ where: { id: prog.id } });
  await db.classe.delete({ where: { id: classe.id } });
  await db.matiere.delete({ where: { id: mat.id } });
  await db.periode.delete({ where: { id: periodePasse.id } });
  if (profCree) await db.personnel.delete({ where: { id: prof.id } });

  const echecs = results.filter((x) => !x.ok).length;
  console.log(`\n===== ${results.length - echecs}/${results.length} PASS =====`);
  if (echecs > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('ERREUR :', e); process.exitCode = 1; }).finally(() => db.$disconnect());
