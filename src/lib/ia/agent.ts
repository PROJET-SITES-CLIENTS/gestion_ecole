// ====================================================================
// ASSISTANT IA — agent conversationnel à outillage (function calling).
// Boucle : message utilisateur → modèle → appels d'outils → exécution
// SERVEUR (permissions de la session re-vérifiées par les cores) →
// réponse finale en français. Chaque exécution est journalisée.
// ====================================================================

import { db } from '@/lib/db';
import { Ctx, logAction } from '@/lib/business/commun';
import { outilsPourSession, versOutilsOpenAI, CATALOGUE_IA } from './outils';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_ETAPEES = 10; // configuration complète : beaucoup d'actions en chaîne // profondeur : jusqu'à 6 vagues d'actions par message

export type MessageIA = { role: 'user' | 'assistant' | 'tool' | 'system'; content: string; tool_call_id?: string; name?: string; tool_calls?: any[] };

export type ResultatAgent = {
  reponse: string;
  actions: Array<{ outil: string; resume: string; ok: boolean }>;
};

/** Clés disponibles : principale + secours (OPENROUTER_API_KEY peut contenir
 *  plusieurs clés séparées par virgules, ou OPENROUTER_API_KEY_SECOURS) —
 *  repli automatique sur quota dépassé (402/429) ou clé invalide (401). */
function clesApi(): string[] {
  const brutes = [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY_SECOURS]
    .filter((x): x is string => Boolean(x))
    .flatMap((x) => x.split(',').map((k) => k.trim()).filter(Boolean));
  if (brutes.length === 0) throw new Error('OPENROUTER_API_KEY manquante (variables d\'environnement).');
  return brutes;
}

async function appelerOpenRouter(messages: MessageIA[], tools: unknown[], toolChoice: 'auto' | 'required' = 'auto'): Promise<any> {
  const cles = clesApi();
  let derniereErreur: Error | null = null;
  for (const cle of cles) {
    const reponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cle}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scolagestion.app',
        'X-Title': 'ScolaGestion Assistant',
      },
      body: JSON.stringify({
        model: process.env.IA_MODELE || 'openai/gpt-4o-mini',
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? toolChoice : undefined,
        temperature: 0.2,
        max_tokens: 900, // réduit : compatible comptes à crédits limités
      }),
      signal: AbortSignal.timeout(45000),
    }).catch(() => null);
    if (reponse?.ok) return reponse.json();
    const texte = reponse ? await reponse.text().catch(() => '') : 'réseau indisponible';
    const statut = reponse?.status ?? 0;
    derniereErreur = new Error(`OpenRouter ${statut} : ${texte.slice(0, 200)}`);
    if (![401, 402, 429].includes(statut)) break; // autre erreur : pas de repli
  }
  throw derniereErreur ?? new Error('OpenRouter injoignable.');
}

export async function invoquerAssistant(opts: {
  ctx: Ctx;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  nomUtilisateur?: string;
  portail?: string;
}): Promise<ResultatAgent> {
  const outils = outilsPourSession(opts.ctx.permissions as Set<string>);
  const ecole = await db.ecole.findUnique({ where: { id: opts.ctx.ecoleId! }, select: { nom: true } });
  const nbOutilsAction = outils.filter((t) => CATALOGUE_IA.find((c) => c.nom === t.nom)).length;

  const systeme = `Tu es l'assistant intelligent de ScolaGestion, la plateforme de gestion de l'école « ${ecole?.nom ?? ''} ».
Tu parles FRANÇAIS. Tu aides l'utilisateur « ${opts.nomUtilisateur ?? 'utilisateur'} » (portail : ${opts.portail ?? 'interne'}).

TES RÈGLES ABSOLUES (VIOLATION = FAUTE GRAVE) :
1. Tu ne peux utiliser QUE les outils mis à disposition — ils correspondent EXACTEMENT aux droits de l'utilisateur (${outils.length} outils disponibles). Si on te demande quelque chose hors de ton périmètre, refuse poliment en expliquant quel rôle peut le faire.
2. INTERDICTION ABSOLUE DE SIMULER UNE ACTION. Pour TOUTE demande de lecture ou d'écriture, tu DOIS appeler l'outil correspondant. NE DIS JAMAIS "c'est fait", "j'ai inscrit", "j'ai encaissé" ou toute confirmation d'action sans avoir PRÉALABLEMENT appelé et reçu la réponse de l'outil. Si tu n'as pas d'outil pour quelque chose, dis-le clairement.
3. Si l'utilisateur a fourni toutes les informations nécessaires, APPELLE L'OUTIL IMMÉDIATEMENT sans demander de confirmation. Si des informations manquent, pose UNE SEULE question précise et concise.
4. Pour trouver un élève par son nom, commence TOUJOURS par rechercher_eleve puis réutilise l'eleveId exact.
5. Les montants : l'utilisateur parle en FRANCS CFA ; les outils attendent des FRANCS (la conversion en centimes est faite pour toi quand nécessaire).
6. TU ES AUSSI UN CONFIGURATEUR COMPLET DE L'ÉCOLE. Tu sais :
   - créer/modifier/supprimer des classes (creer_classes, modifier_classe, supprimer_classe_vide) ;
   - créer les matières par niveau avec les particularités demandées (creer_matieres) ;
   - créer les programmes annuels détaillés chapitre par chapitre avec trimestres et semaines (creer_programme_annee) ;
   - affecter les enseignants aux matières et classes AVEC EXCEPTIONS granulaires : « Jean Bernard enseigne le Français en 6e, 5e, 4e mais PAS en 3e » → affecter_enseignant(classes: "6E,5E,4E", sauf: "3E") ;
   - définir les règles de calcul des moyennes par cycle (regle_calcul_moyenne).
   Quand l'utilisateur décrit sa configuration en langage naturel (avec des exceptions, niveau par niveau), DÉCOMPOSE-la en appels d'outils successifs et exécute-la intégralement — ne demande jamais à l'utilisateur de le faire manuellement. Enchaîne les outils (plusieurs vagues autorisées).
7. Réponds de façon concise, structurée (listes courtes), avec les chiffres exacts retournés par les outils. Termine par proposer la suite logique.
8. Date du jour : ${new Date().toISOString().slice(0, 10)}.`;

  const messages: MessageIA[] = [
    { role: 'system', content: systeme },
    ...opts.messages.map((m) => ({ ...m })),
  ];
  const tools = versOutilsOpenAI(outils);
  const parNom = new Map(outils.map((t) => [t.nom, t]));
  const actions: ResultatAgent['actions'] = [];

  let vientDeTraiterOutils = false;

  for (let etape = 0; etape < MAX_ETAPEES; etape++) {
    // Après des résultats d'outils, on force l'IA à continuer avec un outil (pas de texte prématuré).
    const choixOutil: 'auto' | 'required' = vientDeTraiterOutils ? 'required' : 'auto';
    const data = await appelerOpenRouter(messages, tools, choixOutil);
    const choix = data?.choices?.[0]?.message;
    if (!choix) break;

    if (choix.tool_calls && choix.tool_calls.length > 0) {
      messages.push({ role: 'assistant', content: choix.content ?? '', tool_calls: choix.tool_calls });
      for (const appel of choix.tool_calls) {
        const nom = appel.function?.name as string;
        const outil = parNom.get(nom);
        if (!outil) {
          messages.push({ role: 'tool', tool_call_id: appel.id, name: nom, content: JSON.stringify({ erreur: 'Outil non autorisé pour votre profil.' }) });
          actions.push({ outil: nom, resume: 'refusé (hors périmètre)', ok: false });
          continue;
        }
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(appel.function?.arguments || '{}'); } catch { args = {}; }
        try {
          const resultat = await outil.executer(opts.ctx, args);
          const resume = JSON.stringify(resultat).slice(0, 2500);
          messages.push({ role: 'tool', tool_call_id: appel.id, name: nom, content: resume });
          actions.push({ outil: nom, resume: extraitResume(nom, resultat), ok: true });
          // Journalisation de CHAQUE action IA (traçabilité complète)
          await logAction(db, opts.ctx.ecoleId!, opts.ctx.utilisateurId, `ia.${nom}`, 'assistant_ia', undefined, { args, ok: true } as never).catch(() => {});
        } catch (e: any) {
          const msg = e?.message ?? 'erreur';
          messages.push({ role: 'tool', tool_call_id: appel.id, name: nom, content: JSON.stringify({ erreur: msg }) });
          actions.push({ outil: nom, resume: `erreur : ${msg.slice(0, 100)}`, ok: false });
          await logAction(db, opts.ctx.ecoleId!, opts.ctx.utilisateurId, `ia.${nom}`, 'assistant_ia', undefined, { args, ok: false, erreur: msg } as never).catch(() => {});
        }
      }
      vientDeTraiterOutils = true;
      continue; // nouvelle vague possible
    }

    // Réponse finale (texte, sans tool_calls)
    return { reponse: choix.content ?? '(aucune réponse)', actions };
  }
  return {
    reponse: `J'ai effectué ${actions.length} action(s). Y a-t-il autre chose ?`,
    actions,
  };
  void nbOutilsAction;
}

function extraitResume(nom: string, r: unknown): string {
  const res = r as Record<string, unknown>;
  if (!res || typeof res !== 'object') return String(r).slice(0, 100);
  if (res.erreur) return `erreur : ${String(res.erreur).slice(0, 80)}`;
  const cles = Object.keys(res).filter((k) => typeof res[k] === 'number' || typeof res[k] === 'string').slice(0, 3);
  return cles.map((k) => `${k}=${String(res[k]).slice(0, 40)}`).join(', ') || 'ok';
}
