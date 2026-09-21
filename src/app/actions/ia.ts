'use server';
// ====================================================================
// ASSISTANT IA — action serveur. La session (permissions réelles) est
// transmise à l'agent : chaque outil hérite du périmètre de l'utilisateur.
// ====================================================================
import { ActionError } from '@/lib/business';
import { AuthError, requireSession, portailDuCompte } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { invoquerAssistant } from '@/lib/ia/agent';

type Ok = { ok: true; [k: string]: unknown };
type Err = { ok: false; error: string };
export type ActionResult = Ok | Err;

export async function demanderAssistant(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ActionResult> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return { ok: false, error: 'Assistant IA non configuré (OPENROUTER_API_KEY absente).' };
    }
    const session = await requireSession();
    if (!session.utilisateur.ecoleId) return { ok: false, error: 'Aucune école associée à votre compte.' };
    const ctx = {
      utilisateurId: session.utilisateur.id,
      ecoleId: session.utilisateur.ecoleId,
      type: session.utilisateur.type,
      permissions: session.permissions,
    };
    const portail = portailDuCompte(session.utilisateur.type, session.permissions, session.roles);
    const r = await invoquerAssistant({
      ctx: ctx as never,
      messages: messages.slice(-14), // fenêtre de conversation
      nomUtilisateur: `${session.utilisateur.prenom ?? ''} ${session.utilisateur.nom ?? ''}`.trim(),
      portail,
    });
    if (r.actions.some((a) => a.ok)) revalidatePath('/');
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof AuthError || e instanceof ActionError) return { ok: false, error: e.message };
    console.error('[assistant-ia]', e);
    return { ok: false, error: 'Assistant momentanément indisponible. Réessayez.' };
  }
}
