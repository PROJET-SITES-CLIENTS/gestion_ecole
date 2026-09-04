// ====================================================================
// PAGE D'INSCRIPTION PUBLIQUE — deux modes :
//  1. « Créer mon école » : le DIRECTEUR crée l'établissement + son
//     compte administrateur, ACTIF immédiatement (le système impose
//     que l'administrateur soit le premier à créer son compte).
//  2. « Demander un accès » : les autres membres demandent un compte,
//     validé par l'administrateur avant activation.
// ====================================================================

import { db } from '@/lib/db';
import { FormulaireInscription } from './formulaire';

export const dynamic = 'force-dynamic';

export default async function PageInscription() {
  const ecoles = await db.ecole.findMany({
    where: { deletedAt: null, statut: { in: ['essai', 'actif'] } },
    select: { slug: true, nom: true },
    orderBy: { nom: 'asc' },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <FormulaireInscription ecoles={ecoles} />
    </div>
  );
}
