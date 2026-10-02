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
        model: process.env.IA_MODELE || 'nvidia/nemotron-3-ultra-550b-a55b:free',
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? toolChoice : undefined,
        temperature: 0.2,
        // Les modèles à RAISONNEMENT (nemotron…) consomment le budget tokens
        // en chaîne de pensée : 1500 coupait la réponse avant le tool_call
        // ou le texte final (réponses vides intermittentes). Marge large.
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(45000),
    }).catch(() => null);
    if (reponse?.ok) return reponse.json();
    const texte = reponse ? await reponse.text().catch(() => '') : 'réseau indisponible';
    const statut = reponse?.status ?? 0;
    derniereErreur = new Error(`OpenRouter ${statut} : ${texte.slice(0, 200)}`);
    if (statut === 402) { /* credits epuises -> essayer le modele gratuit */ } if (![401, 402, 429].includes(statut)) break;
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
6. RÈGLE ABSOLUE : ne crée JAMAIS plus que demandé. Si on te demande 2 matières, tu en crées EXACTEMENT 2 (pas 10). N'ajoute PAS d'éléments « standards » de ton propre chef. Les 15 classes par défaut (PS-A à TLE-A) existent déjà — ne les recrée jamais. Pour supprimer une classe : supprimer_classe_vide. Pour supprimer une matière : supprimer_matiere.

⚠️ DISTINCTIONS CRITIQUES — ne confonds JAMAIS ces objets :
• MATIÈRE = entrée du RÉFÉRENTIEL de l'école (liste globale : Français, Maths…). Outils : creer_matieres, modifier_matiere, supprimer_matiere.
• AFFECTATION = un ENSEIGNANT qui enseigne une matière dans une classe. Outils : affecter_enseignant, retirer_affectation, voir_affectations.
• PROGRAMME = le CONTENU annuel d'une matière pour un NIVEAU (chapitres). Outils : creer_programme_annee, supprimer_programme.
• CLASSE = division réelle d'un niveau (6ème A). Outils : creer_classes, modifier_classe, supprimer_classe_vide.
→ « ajouter/supprimer une MATIÈRE » = agir sur le RÉFÉRENTIEL uniquement. Si l'utilisateur mentionne AUSSI une classe ou un enseignant dans la même phrase, fais UNIQUEMENT la demande de matière puis signale-le : "La matière X est créée. Voulez-vous aussi l'affecter à un enseignant en 6ème A ?" — n'exécute JAMAIS l'affectation ou le programme sans demande explicite.

📋 PROCÉDURE ANTI-ERREUR (obligatoire) :
a. Avant toute action de configuration (créer/supprimer/modifier/affecter), énonce mentalement : QUEL type d'objet + QUEL nom exact + COMBIEN. En cas de doute entre deux types d'objets → demande, n'improvise pas.
b. Un outil qui répond { erreur + candidats } signifie plusieurs homonymes : redemande à l'utilisateur en listant les candidats — ne choisis JAMAIS à sa place.
c. Un outil qui répond { erreur + marcheASuivre } : suis cette marche et explique-la simplement à l'utilisateur.
d. Après chaque action, confirme en répétant l'OBJET EXACT touché et son TYPE : "✅ Matière « Dessin » créée dans le référentiel", "✅ Affectation de Jean retirée en 6ème A".
e. Si un outil échoue 2 fois de la même façon, ARRÊTE et explique le blocage à l'utilisateur au lieu de réessayer.

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

  let videsConsecutifs = 0;
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
    const contenu = (choix.content ?? '').trim();
    if (contenu) return { reponse: contenu, actions };
    // Réponse VIDE (raisonnement tronqué du modèle) : on relance l'étape
    // jusqu'à 3 fois — le modèle reformule généralement une réponse pleine.
    console.error('[ARIA] étape sans contenu ni outil :', JSON.stringify({ finish: (data as any)?.choices?.[0]?.finish_reason, contenu: (choix.content ?? '').slice(0, 80), raison: typeof (choix as any).reasoning === 'string' ? (choix as any).reasoning.slice(0, 120) : undefined, toolCalls: choix.tool_calls?.length }).slice(0, 400));
    videsConsecutifs++;
    if (videsConsecutifs <= 3) continue;
    break;
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
  if (res.erreur) {
    const detail = res.candidats && Array.isArray(res.candidats) && (res.candidats as string[]).length > 0
      ? ` (candidats : ${(res.candidats as string[]).slice(0, 3).join(', ')})`
      : '';
    return `erreur : ${String(res.erreur).slice(0, 110)}${detail}`;
  }
  // Libellés lisibles pour les clés métier courantes
  if (Array.isArray(res.creees) || Array.isArray(res.existantes)) {
    const creees = (res.creees as string[]) ?? [];
    const existantes = (res.existantes as string[]) ?? [];
    return `${creees.length} créée(s)${creees.length ? ` : ${creees.slice(0, 4).join(', ')}` : ''}${existantes.length ? ` · ${existantes.length} déjà existante(s)` : ''}`;
  }
  if (res.supprimee) return `supprimé : ${String(res.supprimee)}`;
  if (res.modifiee && res.nouveauNom) return `modifié : ${String(res.modifiee)} → ${String(res.nouveauNom)}`;
  if (res.retiree) return String(res.detail ?? 'retiré');
  if (res.affectationsCreees != null) return `${res.affectationsCreees} affectation(s) : ${String(res.enseignant ?? '')} en ${Array.isArray(res.classesDetail) ? (res.classesDetail as string[]).slice(0, 4).join(', ') : ''}`;
  if (res.blocages) return `bloqué : ${JSON.stringify(res.blocages)}`;
  const cles = Object.keys(res).filter((k) => typeof res[k] === 'number' || typeof res[k] === 'string').slice(0, 3);
  return cles.map((k) => `${k}=${String(res[k]).slice(0, 40)}`).join(', ') || 'ok';
}
