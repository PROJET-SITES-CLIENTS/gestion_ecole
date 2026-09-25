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
        max_tokens: 1500, // augmenté : réponses complètes et naturelles
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

  const systeme = `Tu es ARIA, l'assistante intelligente de ScolaGestion pour l'école « ${ecole?.nom ?? ''} ».
Tu parles FRANÇAIS, de façon naturelle et directe, comme un collaborateur compétent.
Tu aides « ${opts.nomUtilisateur ?? 'l\'utilisateur'} » (portail : ${opts.portail ?? 'interne'}).

COMMENT TU TRAVAILLES :
1. Pour répondre à UNE QUESTION (ex: "combien d'élèves ?"), tu appelles l'outil approprié, puis tu formules la réponse directement : "Vous avez 248 élèves actifs répartis en 12 classes. Voulez-vous la liste par classe ?"
2. Pour effectuer UNE ACTION (ex: "enregistre le paiement de Mamadou"), tu cherches d'abord l'élève (rechercher_eleve), puis tu encaisses, puis tu confirmes : "✅ Paiement de 50 000 F enregistré pour Mamadou Diallo (6ème A). Solde restant : 75 000 F."
3. Tu chaînes les outils silencieusement — l'utilisateur voit seulement ta réponse finale, naturelle et complète.
4. Si tu manques d'informations (ex: quel montant ? quel mode ?), pose UNE seule question claire.
5. JAMAIS de confirmation sans avoir appelé et reçu la réponse de l'outil. JAMAIS de simulation.

TES DROITS : ${outils.length} outils disponibles correspondant exactement aux permissions de l'utilisateur.

STYLE DE RÉPONSE :
- Commence directement par la réponse : "Vous avez…", "✅ C'est fait…", "⚠️ Attention…"
- Donne les chiffres exacts retournés par les outils (pas d'approximation)
- Propose toujours une suite logique en une phrase courte
- Sois concis : max 5 lignes sauf si une liste est demandée

MONTANTS : l'utilisateur parle en FRANCS CFA ; les outils gèrent la conversion.
DATE DU JOUR : ${new Date().toISOString().slice(0, 10)}.`;

  const messages: MessageIA[] = [
    { role: 'system', content: systeme },
    ...opts.messages.map((m) => ({ ...m })),
  ];
  const tools = versOutilsOpenAI(outils);
  const parNom = new Map(outils.map((t) => [t.nom, t]));
  const actions: ResultatAgent['actions'] = [];

  for (let etape = 0; etape < MAX_ETAPEES; etape++) {
    // tool_choice est toujours 'auto' : après avoir traité les outils l'IA choisit
    // librement d'appeler un autre outil OU de formuler une réponse textuelle naturelle.
    const data = await appelerOpenRouter(messages, tools, 'auto');
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
      continue; // l'IA va maintenant décider seule de répondre ou d'enchaîner un outil
    }

    // Réponse finale (texte, sans tool_calls)
    return { reponse: choix.content ?? '(aucune réponse)', actions };
  }

  // Fallback : boucle épuisée sans réponse textuelle — synthèse en langage naturel.
  if (actions.length > 0) {
    const resumeActions = actions.map((a) => `- ${a.outil} : ${a.resume}`).join('\n');
    const synthese = await appelerOpenRouter([
      ...messages,
      { role: 'user', content: `Synthétise en une réponse concise et naturelle en français les résultats obtenus :\n${resumeActions}\nDonne les chiffres clés directement et propose la suite logique.` },
    ], [], 'auto').catch(() => null);
    const contenu = synthese?.choices?.[0]?.message?.content;
    if (contenu) return { reponse: contenu, actions };
    return {
      reponse: `Voici ce que j'ai fait :\n${actions.map((a) => `• ${a.resume}`).join('\n')}\n\nVoulez-vous que je fasse autre chose ?`,
      actions,
    };
  }
  return { reponse: "Je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?", actions };
  void nbOutilsAction;
}

function extraitResume(nom: string, r: unknown): string {
  const res = r as Record<string, unknown>;
  if (!res || typeof res !== 'object') return String(r).slice(0, 100);
  if (res.erreur) return `erreur : ${String(res.erreur).slice(0, 80)}`;
  const cles = Object.keys(res).filter((k) => typeof res[k] === 'number' || typeof res[k] === 'string').slice(0, 3);
  return cles.map((k) => `${k}=${String(res[k]).slice(0, 40)}`).join(', ') || 'ok';
}
