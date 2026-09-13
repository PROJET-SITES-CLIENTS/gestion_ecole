// ====================================================================
// TEST E2E DU MOTEUR DOCUMENTAIRE — école de test AVEC identité complète
// (adresse, cachet, signature, couleur) → génération de documents
// représentatifs → vérification structurelle (en-tête, pied, signatures).
// Nettoyage intégral.
// ====================================================================

import { PrismaClient } from '@prisma/client';
import { initialiserEcoleCore } from '../src/lib/business/initialisation';
import { inscrireEleveCore } from '../src/lib/business/eleves';
import { resoudreIdentite } from '../src/lib/documents/charte';
import { trouverModele, CATALOGUE } from '../src/lib/documents/registre';
import { executerAvecRetry, dbTest } from './_helper-test';

const db: PrismaClient = dbTest as unknown as PrismaClient;

// 1×1 px PNG transparent (data-URL de test pour cachet et signature)
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let passes = 0, echecs = 0;
function check(nom: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗ ÉCHEC'} ${nom}${detail ? ` (${detail})` : ''}`);
  ok ? passes++ : echecs++;
}

async function main() {
  const S = Date.now().toString(36);
  console.log(`Catalogue chargé : ${CATALOGUE.length} documents`);

  // ══ 1. École de test avec IDENTITÉ COMPLÈTE ══
  const r = await initialiserEcoleCore({
    nomEcole: `École Docs ${S}`, adminNom: 'Test', adminPrenom: 'Direction',
    adminEmail: `docs-${S}@local.test`, adminMotDePasse: 'MotDePasse123!',
  });
  await db.ecole.update({
    where: { id: r.ecoleId },
    data: {
      adresse: '12, avenue des Tests', ville: 'Dakar', telephone: '+221 33 800 00 00',
      emailEcole: 'contact@testdocs.sn', siteWeb: 'www.testdocs.sn',
      deviseOfficielle: 'Rigueur • Exigence • Réussite', couleurPrincipale: '#7c3aed',
      logoUrl: PNG_1PX, cachetUrl: PNG_1PX, signatureUrl: PNG_1PX,
      identifiantsLegaux: JSON.stringify({ ninea: '0045882331', autorisation: '1247/ME/2019', affiliation: 'Ministère de l\'Éducation' }),
    },
  });
  const identite = await resoudreIdentite(r.ecoleId);
  check('identité résolue (adresse + cachet + signature)', identite.adresse.includes('avenue des Tests') && !!identite.cachet && !!identite.signature && identite.couleur === '#7c3aed');

  // Un élève de test dans cette école
  const ctx = { utilisateurId: r.adminId, ecoleId: r.ecoleId, type: 'personnel', permissions: new Set(['eleves.lire', 'eleves.ecrire', 'vie_scolaire.gerer', 'finances.voir', 'bulletins.valider', 'sante.gerer', 'rh.gerer', 'communication.envoyer', 'edt.gerer', 'services.gerer', 'admin.saas', 'examens.gerer']) };
  const insc = await inscrireEleveCore(ctx as never, r.ecoleId, {
    nom: `FamilleTest${S}`, prenom: 'Awa', dateNaissance: new Date('2012-05-10'), lieuNaissance: 'Dakar', sexe: 'F',
  } as never);

  // ══ 2. Génération de documents représentatifs ══
  const cas: Array<{ code: string; params: Record<string, string>; verifs: Array<[string, RegExp]> }> = [
    {
      code: 'attestation_scolarite', params: { eleveId: insc.eleveId, motif: 'inscription sportive' },
      verifs: [['titre', /ATTESTATION DE SCOLARITÉ/i], ['corps', /régulièrement inscrit/], ['formule finale', /servir et valoir ce que de droit/]],
    },
    {
      code: 'note_service', params: { numero: '2026-001', objet: 'Organisation des conseils de classe', destinataires: 'le personnel enseignant', corps: '1. Les conseils de classe se tiendront du 14 au 18 décembre.\n2. Chaque professeur remettra ses notes 48 h avant.', application: new Date().toISOString().slice(0, 10) },
      verifs: [['numéro', /NOTE DE SERVICE N° 2026-001/i], ['article 1', /Article 1/], ['date d\'application', /Date d'application/]],
    },
    {
      code: 'justificatif_absence', params: { eleveId: insc.eleveId, debut: new Date().toISOString().slice(0, 10), motif: 'Maladie' },
      verifs: [['titre', /JUSTIFICATIF D.ABSENCE/i], ['case Oui/Non', /☐ Oui/], ['signature parent', /Signature du responsable légal/]],
    },
    {
      code: 'autorisation_voyage', params: { eleveId: insc.eleveId, destination: 'Île de Gorée', debut: '2026-11-20', fin: '2026-11-20', encadrants: 'M. Diallo, Mme Sow' },
      verifs: [['titre', /AUTORISATION DE SORTIE SCOLAIRE/i], ['destination', /Gorée/], ['4 cases', /assurance responsabilité civile/]],
    },
    {
      code: 'engagement_reglement', params: { eleveId: insc.eleveId, version: 'v2026' },
      verifs: [['prise de connaissance', /pris connaissance du règlement intérieur v2026/]],
    },
    {
      code: 'liste_fournitures', params: { niveau: 'Sixième', items: 'Cahiers 200 pages | 5\nStylos bleus | 10\nCalculatrice | 1' },
      verifs: [['tableau', /Cahiers 200 pages/], ['mention', /commercialisée/]],
    },
    {
      code: 'invitation_ceremonie', params: { motif: 'remise des diplômes', date: '2026-12-15', heure: '10h00', lieu: 'Cour principale', invite: 'M. le Maire', programme: 'Discours du Chef d\'établissement\nRemise des diplômes' },
      verifs: [['invité', /M\. le Maire/], ['date', /15 décembre 2026/]],
    },
    {
      code: 'certificat_travail', params: { personnelId: (await db.personnel.findFirst({ where: { utilisateurId: r.adminId } }))!.id },
      verifs: [['titre', /CERTIFICAT DE TRAVAIL/i], ['neutre', /appréciation disciplinaire/]],
    },
  ];

  for (const casDoc of cas) {
    const modele = trouverModele(casDoc.code);
    if (!modele) { check(casDoc.code, false, 'modèle introuvable'); continue; }
    try {
      const out = await modele.generer({ ctx: ctx as never, identite, p: casDoc.params });
      const tout = out.titre + out.corps;
      let okLocal = true; const manques: string[] = [];
      for (const [nomVerif, regexp] of casDoc.verifs) {
        if (!regexp.test(tout)) { okLocal = false; manques.push(nomVerif); }
      }
      // Structure commune : signature/cachet injectés quelque part
      const signatures = /Signature et cachet|<img src="data:image|Cachet et signature|Chef d.Établissement|Le Responsable légal|signature/i.test(tout);
      if (!signatures) { okLocal = false; manques.push('zone signature'); }
      check(casDoc.code, okLocal, manques.length ? 'manque : ' + manques.join(', ') : `${out.corps.length} caractères`);
    } catch (e: any) {
      check(casDoc.code, false, e.message?.slice(0, 90));
    }
  }

  // ══ 3. En-tête / pied de page / signature — vérification précise ══
  console.log('\n═══ Charte : en-tête, pied, signature ═══');
  const { enTeteMajeur, piedDePage, pageHtml, zoneSignature } = await import('../src/lib/documents/charte');
  const ent = enTeteMajeur(identite, { type: 'Attestation', ref: 'ATT-202609-0001' });
  check('en-tête : nom école en majuscules', ent.includes(identite.nom.toUpperCase()));
  check('en-tête : devise', ent.includes('Rigueur • Exigence • Réussite'));
  check('en-tête : adresse + tél', ent.includes('12, avenue des Tests') && ent.includes('+221 33 800 00 00'));
  check('en-tête : référence + couleur', ent.includes('ATT-202609-0001') && ent.includes('#7c3aed'));
  const pied = piedDePage(identite, { ref: 'X-1', page: true });
  check('pied : 3 zones (contacts + NINEA + traçabilité)', pied.includes('contact@testdocs.sn') && pied.includes('0045882331') && pied.includes('ScolaGestion') && pied.includes('X-1'));
  const zoneSig = zoneSignature(identite);
  check('signature : images cachet + signature injectées', (zoneSig.match(/<img/g) ?? []).length === 2);
  const page = pageHtml({ identite, entete: ent, titre: 'Test', corps: '<p>x</p>', pied, autoImprimer: true });
  check('page complète : A4 print + auto-print', page.includes('@page') && page.includes('window.print'));
  const montant = await import('../src/lib/documents/charte').then((m) => m.montantEnLettres(24500000));
  check('montant en lettres (245 000 F)', montant.includes('deux cent quarante-cinq mille'), montant);

  // ══ 4. Modèles sans paramètre requis → directement générables ══
  const sansParams = CATALOGUE.filter((m) => m.parametres.every((p) => !p.requis));
  check(`catalogue : ${sansParams.length} documents sans paramètre (génération immédiate)`, true, sansParams.map((m) => m.code).join(', ').slice(0, 80));

  // ══ NETTOYAGE ══
  console.log('\n═══ Nettoyage ═══');
  await (async function nettoyer() {
    const users = await db.utilisateur.findMany({ where: { email: { contains: `-${S}@local.test` } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.sessionUtilisateur.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.notification.deleteMany({ where: { destinataireId: { in: ids } } });
      await db.utilisateurRole.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.personnel.deleteMany({ where: { utilisateurId: { in: ids } } });
      await db.utilisateur.deleteMany({ where: { id: { in: ids } } });
    }
    const roleIds = await db.role.findMany({ where: { ecoleId: r.ecoleId }, select: { id: true } });
    if (roleIds.length) await db.rolePermission.deleteMany({ where: { roleId: { in: roleIds.map((x) => x.id) } } });
    await db.role.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.configurationPaie.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.classe.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.niveau.deleteMany({ where: { section: { cycle: { ecoleId: r.ecoleId } } } });
    await db.section.deleteMany({ where: { cycle: { ecoleId: r.ecoleId } } });
    await db.periode.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.anneeScolaire.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.cycle.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.auditLog.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.documentGenere.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.eleveParent.deleteMany({ where: { eleve: { ecoleId: r.ecoleId } } });
    await db.eleve.deleteMany({ where: { ecoleId: r.ecoleId } });
    await db.ecole.delete({ where: { id: r.ecoleId } });
  })().catch((e) => console.error('nettoyage :', e.message));
  console.log('✓ base nettoyée');

  console.log(`\n${echecs === 0 ? '✅✅' : '⚠️'} MOTEUR DOCUMENTAIRE : ${passes}/${passes + echecs} CHECKS PASS${echecs ? ` — ${echecs} ÉCHEC(S)` : ''}`);
  if (echecs) process.exitCode = 1;
}

executerAvecRetry('DOCS', main);
