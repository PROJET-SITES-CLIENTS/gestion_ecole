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
const MAX_ETAPEES = 6; // profondeur : jusqu'à 6 vagues d'actions par message

export type MessageIA = { role: 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; name?: string; tool_calls?: any[] };

export type ResultatAgent = {
  reponse: string;
  actions: Array<{ outil: string; resume: string; ok: boolean }>;
};

function cleApi(): string {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new Error('OPENROUTER_API_KEY manquante (variables d\'environnement).');
  return k;
}

async function appelerOpenRouter(messages: MessageIA[], tools: unknown[]): Promise<any> {
  const reponse = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleApi()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://scolagestion.app',
      'X-Title': 'ScolaGestion Assistant',
    },
    body: JSON.stringify({
      model: process.env.IA_MODELE || 'openai/gpt-4o-mini',
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: 'auto',
      temperature: 0.2,
      max_tokens: 1600,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!reponse.ok) {
    const texte = await reponse.text().catch(() => '');
    throw new Error(`OpenRouter ${reponse.status} : ${texte.slice(0, 200)}`);
  }
  return reponse.json();
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

TES RÈGLES ABSOLUES :
1. Tu ne peux utiliser QUE les outils mis à disposition — ils correspondent EXACTEMENT aux droits de l'utilisateur (${outils.length} outils disponibles). Si on te demande quelque chose hors de ton périmètre, refuse poliment en expliquant quel rôle peut le faire.
2. Pour TOUTE demande de données, UTILISE les outils (jamais d'invention). Pour toute action, utilise l'outil correspondant — exécute VRAIMENT, en profondeur, sans demander de confirmation inutile.
3. Pour trouver un élève par son nom, commence TOUJOURS par rechercher_eleve puis réutilise l'eleveId exact.
4. Les montants : l'utilisateur parle en FRANCS CFA ; les outils attendent des FRANCS (la conversion en centimes est faite pour toi quand nécessaire).
5. Réponds de façon concise, structurée (listes courtes), avec les chiffres exacts retournés par les outils. Termine par proposer la suite logique.
6. Date du jour : ${new Date().toISOString().slice(0, 10)}.`;

  const messages: MessageIA[] = [
    { role: 'user', content: systeme },
    ...opts.messages.map((m) => ({ ...m })),
  ];
  const tools = versOutilsOpenAI(outils);
  const parNom = new Map(outils.map((t) => [t.nom, t]));
  const actions: ResultatAgent['actions'] = [];

  for (let etape = 0; etape < MAX_ETAPEES; etape++) {
    const data = await appelerOpenRouter(messages, tools);
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
      continue; // nouvelle vague possible
    }

    // Réponse finale
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
