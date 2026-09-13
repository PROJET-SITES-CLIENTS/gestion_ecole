// ====================================================================
// REGISTRE ASSEMBLÉ — point d'entrée : les 65 documents de l'école
// ====================================================================

import { ModeleDoc } from './registre-types';
import { docsPedagogie } from './registre-pedagogie';
import { docsVieScolaire, docsFinances, docsRh } from './registre-reste';
import { docsSante, docsCommunication, docsAdmissions, docsServices } from './registre-services';

export const CATALOGUE: ModeleDoc[] = [
  ...docsPedagogie,
  ...docsVieScolaire,
  ...docsFinances,
  ...docsRh,
  ...docsSante,
  ...docsCommunication,
  ...docsAdmissions,
  ...docsServices,
];

export function trouverModele(code: string): ModeleDoc | undefined {
  return CATALOGUE.find((m) => m.code === code);
}

export const DOMAINES = [...new Set(CATALOGUE.map((m) => m.domaine))];

export type { ModeleDoc } from './registre-types';
