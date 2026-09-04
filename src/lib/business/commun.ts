// ====================================================================
// COUCHE MÉTIER — socle commun
// Les fonctions métier sont PURES (aucune dépendance Next/cookies) :
// elles reçoivent un contexte d'exécution et des entrées déjà validées
// (zod côté actions). Elles sont directement testables hors Next.
// ====================================================================

import { db } from '@/lib/db';

export type Ctx = {
  utilisateurId: string;
  ecoleId: string | null;
  type: string; // super_admin/personnel/parent/eleve
  permissions: Set<string>;
};

export class ActionError extends Error {
  code: string;
  constructor(message: string, code = 'ERREUR_METIER') {
    super(message);
    this.name = 'ActionError';
    this.code = code;
  }
}

/** Échec si le contexte ne possède pas la permission demandée. */
export function assertPermission(ctx: Ctx, code: string) {
  if (ctx.type === 'super_admin') return; // super-admin éditeur : tout
  if (!ctx.permissions.has(code)) {
    throw new ActionError(`Permission refusée : « ${code} » est requis pour cette opération.`, 'PERMISSION_REFUSEE');
  }
}

/** Échec si une entité n'appartient pas à l'école du contexte (multi-tenant). */
export function assertTenant(ecoleIdEntite: string | null | undefined, ctx: Ctx, nomEntite: string) {
  if (ctx.type === 'super_admin') return; // vue cross-tenant de l'éditeur
  if (!ecoleIdEntite || !ctx.ecoleId || ecoleIdEntite !== ctx.ecoleId) {
    throw new ActionError(`${nomEntite} n'appartient pas à votre école.`, 'TENANT_INVALIDE');
  }
}

/** Client Prisma ou transaction interactive (pour les écritures tx-safe). */
export type DbClient = Pick<typeof db, 'auditLog' | 'notification' | 'eleveParent' | 'utilisateur'>;

/** Journal d'audit immuable. tx-safe : passer la transaction quand on est DEDANS. */
export async function logAction(
  client: DbClient,
  ecoleId: string | null,
  utilisateurId: string,
  action: string,
  cibleType?: string,
  cibleId?: string,
  details?: unknown,
) {
  await client.auditLog.create({
    data: {
      ecoleId,
      utilisateurId,
      action,
      cibleType,
      cibleId,
      details: details === undefined ? null : JSON.stringify(details),
    },
  });
}

/** Utilisateur de direction de l'école (déterministe). tx-safe optionnel. */
export async function getDirectionUserId(ecoleId: string, client: DbClient = db) {
  const u = await client.utilisateur.findFirst({
    where: { ecoleId, type: 'personnel', email: { startsWith: 'direction@' } },
    orderBy: { createdAt: 'asc' },
  });
  if (u) return u.id;
  const fallback = await client.utilisateur.findFirst({
    where: { ecoleId, type: 'personnel' },
    orderBy: { createdAt: 'asc' },
  });
  return fallback?.id ?? 'system';
}

/**
 * NOTIFICATIONS RÉELLES — crée une ligne Notification par utilisateur
 * parent de l'élève (comptes liés via ParentTuteur.utilisateurId) + la
 * direction. Retourne le nombre de notifications effectivement créées.
 */
export async function notifierParentsEtDirection(
  tx: DbClient,
  ecoleId: string,
  eleveId: string,
  sujet: string,
  corps: string,
  opts: { direction?: boolean; canal?: string } = {},
): Promise<number> {
  // IMPORTANT : toutes les lectures passent par la MÊME transaction que les
  // écritures (SQLite = 1 connexion : un db global à l'intérieur d'une tx bloque).
  const parents = await tx.eleveParent.findMany({
    where: { eleveId },
    include: { parent: { include: { utilisateur: true } } },
  });
  let crees = 0;
  const canal = opts.canal ?? 'in_app';
  for (const ep of parents) {
    const u = ep.parent.utilisateur;
    if (!u || !u.actif) continue;
    await tx.notification.create({
      data: {
        ecoleId,
        destinataireType: 'parent',
        destinataireId: u.id,
        sujet,
        corps,
        canal,
        statut: 'envoye',
        dateEnvoi: new Date(),
      },
    });
    crees++;
  }
  if (opts.direction !== false) {
    const dirId = await getDirectionUserId(ecoleId, tx);
    await tx.notification.create({
      data: {
        ecoleId,
        destinataireType: 'personnel',
        destinataireId: dirId,
        sujet,
        corps,
        canal,
        statut: 'envoye',
        dateEnvoi: new Date(),
      },
    });
    crees++;
  }
  return crees;
}

/** Vérifie qu'un élève appartient au tenant et existe. */
export async function eleveDuTenant(eleveId: string, ctx: Ctx) {
  const eleve = await db.eleve.findUnique({ where: { id: eleveId } });
  if (!eleve) throw new ActionError('Élève introuvable.', 'INTROUVABLE');
  assertTenant(eleve.ecoleId, ctx, 'Cet élève');
  return eleve;
}

/** Chevauchement de tranches horaires "HH:MM". */
export function tranchesSeChevauchent(d1: string, f1: string, d2: string, f2: string): boolean {
  const toMin = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + (mm || 0);
  };
  return toMin(d1) < toMin(f2) && toMin(d2) < toMin(f1);
}

// --------------------------------------------------------------------
// VERROU D'ÉCRITURE IN-PROCESS (T2 définitif)
// Le SQLite embarqué de cette plateforme tolère des lectures « sales »
// entre connexions (une 2e transaction VOIT les écritures non commitées de
// la 1re — constaté expérimentalement : les verrous conditionnels SQL sont
// alors contournables). On sérialise donc les opérations sensibles au sein
// du processus — là où la concurrence réelle se produit (requêtes serveur).
// --------------------------------------------------------------------
const verrous = new Map<string, Promise<unknown>>();

export function avecVerrou<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  const precedent = verrous.get(cle) ?? Promise.resolve();
  const execution = precedent.then(fn, fn);
  const stockee = execution.catch(() => { /* le suivant doit partir quoi qu'il arrive */ });
  verrous.set(cle, stockee);
  stockee.then(() => {
    if (verrous.get(cle) === stockee) verrous.delete(cle);
  });
  return execution;
}

/**
 * Retry automatique sur conflit d'écriture concurrente (P2034 / SQLite
 * "database is locked") : le perdant de la course RETENTE la transaction
 * entière, relit l'état frais, et obtient soit un succès cohérent, soit
 * un refus métier PROPRE (ex. « dépasse le restant dû »).
 */
export async function avecRetryConflit<T>(fn: () => Promise<T>, maxEssais = 3): Promise<T> {
  let derniere: unknown;
  for (let essai = 1; essai <= maxEssais; essai++) {
    try {
      return await fn();
    } catch (e: any) {
      const conflit =
        e?.code === 'P2034' ||
        e?.code === 'P1008' && /transaction.*(expired|already closed)/i.test(String(e?.message)) ||
        /database is locked|write conflict|Transaction already closed/i.test(String(e?.message ?? ''));
      if (!conflit || essai === maxEssais) {
        // dernier essai : transformer en erreur métier lisible plutôt qu'un crash
        if (conflit) {
          throw new ActionError(
            'Opération concurrente détectée sur les mêmes données. Réessayez dans un instant.',
            'CONFLIT_CONCURRENT',
          );
        }
        throw e;
      }
      derniere = e;
      await new Promise((r) => setTimeout(r, 50 * essai)); // backoff léger
    }
  }
  throw derniere;
}
