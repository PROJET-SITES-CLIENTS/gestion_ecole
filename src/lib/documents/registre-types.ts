// ====================================================================
// TYPES PARTAGÉS DU MOTEUR DOCUMENTAIRE
// ====================================================================

import { Identite } from './charte';
import { Ctx } from '@/lib/business/commun';

export type TypeParam =
  | 'eleve' | 'classe' | 'periode' | 'personnel'
  | 'paiement' | 'incident' | 'candidature' | 'conge' | 'passage'
  | 'evaluationRh' | 'bulletinPaie'
  | 'texte' | 'textarea' | 'date' | 'nombre' | 'select';

export type ParamDoc = {
  cle: string;
  libelle: string;
  type: TypeParam;
  requis?: boolean;
  options?: Array<{ valeur: string; libelle: string }>;
  aide?: string;
};

export type CtxDoc = { ctx: Ctx; identite: Identite; p: Record<string, string> };

export type ModeleDoc = {
  code: string;
  libelle: string;
  domaine: string;
  description: string;
  entete: 'majeur' | 'mineur' | 'financier';
  confidential?: boolean;
  filigrane?: string; // texte en filigrane (ex : 'Original')
  permission?: string;
  parametres: ParamDoc[];
  generer(c: CtxDoc): Promise<{ titre: string; corps: string; sousTitre?: string }>;
};
