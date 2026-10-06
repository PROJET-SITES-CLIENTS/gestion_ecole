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

  // TOUS les outils sont envoyés au tour 0 : la stratégie 2-phase gère la
  // saturation du modèle thinking (après l'appel d'outil → synthèse SANS
  // outils). Le plafond à 60 coupait les outils CRUD (supprimer/modifier)
  // qui sont en fin de catalogue.
  let tools = versOutilsOpenAI(outils);
  const systeme = `Tu es ARIA, l'assistante intelligente de ScolaGestion pour l'école « ${ecole?.nom ?? ''} ».
Tu parles FRANÇAIS, de façon naturelle et directe, comme un collaborateur compétent.
Tu aides « ${opts.nomUtilisateur ?? 'l\'utilisateur'} » (portail : ${opts.portail ?? 'interne'}).

FORMAT D'APPEL D'OUTILS — RÈGLE ABSOLUE : utilise EXCLUSIVEMENT le mécanisme natif de function calling (le champ tool_calls structuré fourni par l'API). N'écris JAMAIS de balises <tool_call> ou <function=> ou <parameter=> dans ta réponse texte. Si tu veux appeler un outil, utilise le mécanisme natif. Ta réponse texte ne doit contenir QUE du français destiné à l'utilisateur.

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

TES DROITS : ${outils.length > 0 ? outils.length + ' outils disponibles correspondant exactement aux permissions de l’utilisateur.' : 'AUCUN outil disponible — réponds avec ce que tu sais, explique la limitation, ne prétends JAMAIS avoir agi.'}

STYLE DE RÉPONSE :
- Commence directement par la réponse : "Vous avez…", "✅ C'est fait…", "⚠️ Attention…"
- Donne les chiffres exacts retournés par les outils (pas d'approximation)
- Propose toujours une suite logique en une phrase courte
- Sois concis : max 5 lignes sauf si une liste est demandée

👨‍🏫 SI TU PARLES À UN ENSEIGNANT : il peut TOUT faire par ta voix — ses classes (mes_classes), son EDT (mon_emploi_du_temps), l'appel (faire_appel), la clôture de séance avec avancement et reste à rattraper (ecrire_cahier_textes), les évaluations (creer_evaluation, modifier/supprimer), la saisie des notes (saisir_notes — élève: note ou abs), les devoirs (assigner_devoir, noter_rendu_devoir), les compétences (saisir_competences), les incidents (declarer_incident), les dispenses (creer_dispense), les RDV parents (ouvrir_creneaux_rdv, mes_rdvs), le rythme de ses programmes (avancement_programmes). Utilise ces outils directement plutôt que de renvoyer vers l'interface.

🗂️ SI TU PARLES AU SECRÉTARIAT : il peut TOUT faire par ta voix — inscrire un élève (inscrire_eleve), candidatures et admissions complètes (creer_candidature, avancer_candidature, saisir_test_admission, convertir_candidature, lister_candidatures), dossiers (lister_pieces_dossier, basculer_piece_dossier, ajouter_piece_exigee, retirer_piece_exigee, lister_documents_eleve, supprimer_document_eleve, relancer_pieces_dossier), courrier (enregistrer_courrier, traiter_courrier, supprimer_courrier), réinscriptions (reinscrire_eleve, annuler_reinscription), absents du jour et justifications (absences_du_jour, justifier_absence, justifier_retard), impayés (relancer_impayes, suivi_paiements_scolarite), visiteurs (enregistrer_visiteur, sortie_visiteur, lister_visiteurs), réunions (creer_reunion_collective), effectifs (effectifs_par_niveau), familles (maj_coordonnees_famille, rattacher_parent).

💰 SI TU PARLES AU COMPTABLE : il peut TOUT faire par ta voix — encaissements (encaisser_paiement), dépenses (enregistrer/valider/annuler_depense), frais et échéances (creer_frais, generer_echeances_classe, appliquer_remise, annuler_echeance, modifier_frais), écritures (passer_ecriture_comptable, creer_ecriture_brouillon, valider_ecriture, generer_ecritures_automatiques), plan comptable (initialiser_plan, completer_plan, creer_compte_comptable), fournisseurs (creer_fournisseur, creer_commande, enregistrer_facture_fournisseur, payer_fournisseur), stock (creer_article_stock, mouvement_stock), budgets (creer_budget), immobilisations (enregistrer_immobilisation, generer_dotations), caisse (caisse_operations), rapprochement (creer_rapprochement_bancaire, importer_releve, rapprochement_auto), clôture (cloture_mensuelle, cloturer_exercice_comptable, provisionner_creances), TVA (etat_tva), rapports (balance_comptable, compte_resultat, bilan_simplifie, grand_livre, balance_agee_clients, etat_caisse, situation_financiere), relances (relancer_impayes).

MONTANTS : l'utilisateur parle en FRANCS CFA ; les outils gèrent la conversion.
DATE DU JOUR : ${new Date().toISOString().slice(0, 10)}.`;

  const messages: MessageIA[] = [
    { role: 'system', content: systeme },
    ...opts.messages.map((m) => ({ ...m })),
  ];
  const parNom = new Map(outils.map((t) => [t.nom, t]));
  const actions: ResultatAgent['actions'] = [];

  let videsConsecutifs = 0;
  for (let etape = 0; etape < MAX_ETAPEES; etape++) {
    const toolsCeTour = etape === 0 ? tools : [];
    let data = await appelerOpenRouter(messages, toolsCeTour, 'auto').catch(async (e) => {
      const msg = String((e as Error)?.message ?? '');
      console.error('[ARIA] appel avec outils échoué :', msg.slice(0, 200));
      if (/OpenRouter 400/.test(msg) && etape === 0) {
        return appelerOpenRouter(messages, [], 'auto');
      }
      throw e;
    });
    const choix = data?.choices?.[0]?.message;
    if (!choix) break;

    // ═══ PARSEUR UNIVERSEL — le modèle nemotron émet des appels d'outils ═══
    // dans son TEXTE sous 3 formats différents au lieu du champ natif :
    //   1. XML : <tool_call><function=nom><parameter=clé>val</parameter></function></tool_call>
    //   2. JSON array : [{"name":"nom","parameters":{...}}]
    //   3. JSON wrapper : {"tool_calls":[{"function":{"name":"nom","arguments":{...}}}}'
    // On les intercepte TOUS et les convertit au format natif.
    const parsedToolCalls = parseToolCallsFromText(choix.content ?? '', parNom);
    const effectiveToolCalls = (choix.tool_calls && choix.tool_calls.length > 0)
      ? choix.tool_calls
      : parsedToolCalls;

    if (effectiveToolCalls && effectiveToolCalls.length > 0) {
      messages.push({ role: 'assistant', content: '', tool_calls: effectiveToolCalls });
      for (const appel of effectiveToolCalls) {
        const nom = appel.function?.name as string;
        const outil = parNom.get(nom);
        if (!outil) {
          messages.push({ role: 'tool', tool_call_id: appel.id ?? `xml-${Date.now()}`, name: nom, content: JSON.stringify({ erreur: 'Outil non autorisé pour votre profil.' }) });
          actions.push({ outil: nom, resume: 'refusé (hors périmètre)', ok: false });
          continue;
        }
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(appel.function?.arguments || '{}'); } catch { args = {}; }
        try {
          const resultat = await outil.executer(opts.ctx, args);
          const resume = JSON.stringify(resultat).slice(0, 2500);
          messages.push({ role: 'tool', tool_call_id: appel.id ?? `xml-${Date.now()}-${nom}`, name: nom, content: resume });
          actions.push({ outil: nom, resume: extraitResume(nom, resultat), ok: true });
          await logAction(db, opts.ctx.ecoleId!, opts.ctx.utilisateurId, `ia.${nom}`, 'assistant_ia', undefined, { args, ok: true } as never).catch(() => {});
        } catch (e: any) {
          const msg = e?.message ?? 'erreur';
          messages.push({ role: 'tool', tool_call_id: appel.id ?? `xml-${Date.now()}-${nom}`, name: nom, content: JSON.stringify({ erreur: msg }) });
          actions.push({ outil: nom, resume: `erreur : ${msg.slice(0, 100)}`, ok: false });
          await logAction(db, opts.ctx.ecoleId!, opts.ctx.utilisateurId, `ia.${nom}`, 'assistant_ia', undefined, { args, ok: false, erreur: msg } as never).catch(() => {});
        }
      }

      // Synthèse directe après les résultats
      const syntheseDirecte = await appelerOpenRouter([
        { role: 'system', content: 'Tu es ARIA. Un outil vient de retourner des résultats. Rédige la réponse finale en français : chiffres clés directement, puis une suggestion de suite. Maximum 5 lignes. Pas de préambule. N\'utilise JAMAIS le format <tool_call>.' },
        { role: 'user', content: `Résultats des outils :\n${actions.map((a) => `${a.ok ? '✓' : '✗'} ${a.outil} : ${a.resume}`).join('\n')}` },
      ], [], 'auto').catch(() => null);
      const texteSynthese = syntheseDirecte?.choices?.[0]?.message?.content?.trim();
      if (texteSynthese) return { reponse: texteSynthese, actions };
      continue;
    }

    // Réponse texte — nettoyer tout résidu d'appel d'outil (XML ou JSON)
    const contenuBrut = (choix.content ?? '').trim();
    const contenu = contenuBrut
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
      .replace(/\[\s*\[[\s\S]*?\]\s*\]/g, (match) => {
        // Ne retirer que si c'est du JSON d'appel d'outil (pas du texte normal entre crochets)
        try { JSON.parse(match); return ''; } catch { return match; }
      })
      .replace(/^\s*\[\s*\{[\s\S]*?\}\s*\]\s*$/g, (match) => {
        try { const p = JSON.parse(match); return (Array.isArray(p) && p[0]?.name) ? '' : match; } catch { return match; }
      })
      .trim();
    if (contenu && contenu.length > 2 && !contenu.startsWith('<tool_call') && !contenu.startsWith('[{')) return { reponse: contenu, actions };
    videsConsecutifs++;
    if (videsConsecutifs <= 2) continue;
    break;
  }

  // Fallback : boucle épuisée sans réponse textuelle — synthèse en langage naturel.
  if (actions.length > 0) {
    const resumeActions = actions.map((a) => `- ${a.outil} : ${a.resume}`).join('\n');
    const synthese = await appelerOpenRouter([
      { role: 'system', content: 'Tu es ARIA. Réponds en français, naturellement, en 3 lignes max.' },
      { role: 'user', content: `Voici les résultats obtenus par mes outils :\n${resumeActions}\n\nRédige la réponse finale : chiffres clés directement, puis une suggestion de suite. Pas de préambule.` },
    ], [], 'auto').catch(() => null);
    const contenu = synthese?.choices?.[0]?.message?.content;
    if (contenu && contenu.trim()) return { reponse: contenu.trim(), actions };
    return {
      reponse: `Voici ce que j'ai fait :\n${actions.map((a) => `• ${a.resume}`).join('\n')}\n\nVoulez-vous que je fasse autre chose ?`,
      actions,
    };
  }
  return { reponse: "Je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?", actions };
}

// --------------------------------------------------------------------
// PARSEUR UNIVERSEL D'APPELS D'OUTILS DEPUIS LE TEXTE
// Le modèle nemotron gratuit émet parfois ses appels d'outils dans son
// texte au lieu du champ natif tool_calls. Ce parseur détecte les 3
// formats observés et les convertit au format natif.
// --------------------------------------------------------------------
function parseToolCallsFromText(texte: string, parNom: Map<string, any>): Array<{ id: string; function: { name: string; arguments: string } }> {
  if (!texte || texte.length < 5) return [];
  const resultats: Array<{ id: string; function: { name: string; arguments: string } }> = [];
  let compteur = 0;

  // ── Format 1 : XML <tool_call><function=nom><parameter=k>v</parameter>──
  if (texte.includes('<tool_call>')) {
    const blocs = texte.split('<tool_call>').slice(1);
    for (const blocBrut of blocs) {
      const bloc = blocBrut.split('</tool_call>')[0];
      const nom = bloc.match(/<function=(\w+)>/)?.[1];
      if (!nom || !parNom.has(nom)) continue;
      const args: Record<string, unknown> = {};
      for (const p of bloc.matchAll(/<parameter=(\w+)>\s*([\s\S]*?)\s*<\/parameter>/g)) {
        args[p[1]] = p[2].trim();
      }
      resultats.push({ id: `txt-${Date.now()}-${compteur++}`, function: { name: nom, arguments: JSON.stringify(args) } });
    }
  }

  // ── Format 2 : JSON array [{"name":"nom","parameters":{...}}] ──
  // Le modèle écrit parfois [[{"name":...}]] ou [{"name":...}] dans son texte
  const jsonArrays = texte.match(/\[\s*\[[\s\S]*?\]\s*\]|\[\s*\{[\s\S]*?\}\s*\]/g);
  if (jsonArrays) {
    for (const ja of jsonArrays) {
      try {
        let parsed = JSON.parse(ja);
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) parsed = parsed[0]; // [[...]] → [...]
        if (!Array.isArray(parsed)) parsed = [parsed];
        for (const item of parsed) {
          const nom = item.name ?? item.function?.name;
          if (!nom || !parNom.has(nom)) continue;
          const args = item.parameters ?? item.arguments ?? item.function?.arguments ?? {};
          resultats.push({ id: `txt-${Date.now()}-${compteur++}`, function: { name: nom, arguments: JSON.stringify(args) } });
        }
      } catch { /* pas du JSON valide */ }
    }
  }

  // ── Format 3 : JSON wrapper {"tool_calls":[{"function":{...}}]} ──
  if (texte.includes('"tool_calls"')) {
    try {
      const wrapper = JSON.parse(texte);
      if (wrapper.tool_calls && Array.isArray(wrapper.tool_calls)) {
        for (const tc of wrapper.tool_calls) {
          const nom = tc.function?.name ?? tc.name;
          if (!nom || !parNom.has(nom)) continue;
          const args = tc.function?.arguments ?? tc.parameters ?? {};
          resultats.push({ id: `txt-${Date.now()}-${compteur++}`, function: { name: nom, arguments: typeof args === 'string' ? args : JSON.stringify(args) } });
        }
      }
    } catch { /* pas du JSON valide */ }
  }

  // ── Format 4 : objet simple {"name":"nom","parameters":{...}} ──
  if (resultats.length === 0 && texte.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(texte.trim());
      const nom = obj.name ?? obj.function?.name;
      if (nom && parNom.has(nom)) {
        const args = obj.parameters ?? obj.arguments ?? obj.function?.arguments ?? {};
        resultats.push({ id: `txt-${Date.now()}-${compteur++}`, function: { name: nom, arguments: JSON.stringify(args) } });
      }
    } catch { /* pas du JSON */ }
  }

  return resultats;
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
