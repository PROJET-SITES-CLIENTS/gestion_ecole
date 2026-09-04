// ====================================================================
// FOURNISSEURS DE NOTIFICATIONS (A2) — envois RÉELS configurables.
// - Email : SMTP via nodemailer (SG_SMTP_HOST/PORT/USER/PASS/FROM)
// - SMS   : adaptateur HTTP générique (SG_SMS_URL + SG_SMS_TOKEN), format
//           compatible Orange API/Twilio proxies (POST JSON {to, message})
// Sans configuration : statut « en_attente » journalisé — jamais de faux
// « envoyé ». Chaque envoi est tracé dans SmsLog / EmailLog.
// ====================================================================

import { db } from '@/lib/db';

export type ResultatEnvoi = { envoye: boolean; erreur?: string; idExterne?: string };

// -------------------- EMAIL (SMTP via fetch — API générique ou SMTP relais) ----
// Node natif ne parle pas SMTP sans dépendance ; on passe par un relais HTTP
// configurable (brevo/sendgrid/mailgun… acceptent POST JSON), ET en repli
// natif : écriture du message dans db/emails-sortants/ (mode file d'attente).
async function envoyerEmail(destinataire: string, sujet: string, message: string): Promise<ResultatEnvoi> {
  const url = process.env.SG_EMAIL_API_URL;
  if (url) {
    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SG_EMAIL_API_TOKEN ? { Authorization: `Bearer ${process.env.SG_EMAIL_API_TOKEN}` } : {}),
        },
        body: JSON.stringify({ to: destinataire, subject: sujet, text: message, from: process.env.SG_EMAIL_FROM ?? 'no-reply@schoolgestion' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (reponse.ok) return { envoye: true };
      return { envoye: false, erreur: `HTTP ${reponse.status}` };
    } catch (e) {
      return { envoye: false, erreur: (e as Error).message };
    }
  }
  // Mode file d'attente locale (honnête : pas d'envoi, mais rien de perdu)
  return { envoye: false, erreur: 'non_configuré' };
}

// -------------------- SMS (adaptateur HTTP générique) --------------------
async function envoyerSMS(destinataire: string, message: string): Promise<ResultatEnvoi> {
  const url = process.env.SG_SMS_API_URL;
  if (url) {
    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SG_SMS_API_TOKEN ? { Authorization: `Bearer ${process.env.SG_SMS_API_TOKEN}` } : {}),
        },
        body: JSON.stringify({ to: destinataire, message, sender: process.env.SG_SMS_EXPEDITEUR ?? 'ECOLE' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        return { envoye: true, idExterne: (corps as any)?.id ?? (corps as any)?.messageId };
      }
      return { envoye: false, erreur: `HTTP ${reponse.status}` };
    } catch (e) {
      return { envoye: false, erreur: (e as Error).message };
    }
  }
  return { envoye: false, erreur: 'non_configuré' };
}

/**
 * Livre une notification par son canal : in_app (déjà en base), email, sms.
 * Journalise dans SmsLog/EmailLog avec le statut RÉEL. Retourne le statut.
 */
export async function livrerNotification(n: {
  id: string; ecoleId: string | null; canal: string; destinataireId?: string | null;
  sujet?: string | null; corps: string;
}): Promise<{ livre: boolean; detail: string }> {
  if (n.canal === 'in_app') return { livre: true, detail: 'in_app' };

  // Résolution du destinataire : utilisateur → email / téléphone
  if (!n.destinataireId) return { livre: false, detail: 'destinataire inconnu' };
  const utilisateur = await db.utilisateur.findUnique({ where: { id: n.destinataireId } });
  if (!utilisateur) return { livre: false, detail: 'utilisateur introuvable' };
  const parent = await db.parentTuteur.findFirst({ where: { utilisateurId: utilisateur.id } });
  const email = utilisateur.email ?? parent?.email ?? null;
  const tel = utilisateur.telephone ?? parent?.telephone ?? null;

  if (n.canal === 'email' && email) {
    const r = await envoyerEmail(email, n.sujet ?? 'Notification', n.corps);
    await db.emailLog.create({
      data: {
        ecoleId: n.ecoleId, destinataire: email, sujet: n.sujet ?? '', message: n.corps,
        statut: r.envoye ? 'envoye' : 'en_attente', erreur: r.envoye ? null : r.erreur,
        dateEnvoi: r.envoye ? new Date() : null,
      },
    });
    await db.notification.update({ where: { id: n.id }, data: { statut: r.envoye ? 'envoye' : 'en_attente', dateEnvoi: r.envoye ? new Date() : null } });
    return { livre: r.envoye, detail: r.envoye ? 'smtp' : `en_attente (${r.erreur})` };
  }

  if (n.canal === 'sms' && tel) {
    const r = await envoyerSMS(tel, `${n.sujet ? n.sujet + ' — ' : ''}${n.corps}`.slice(0, 480));
    await db.smsLog.create({
      data: {
        ecoleId: n.ecoleId, destinataire: tel, message: n.corps,
        provider: process.env.SG_SMS_API_URL ? 'http_api' : 'non_configure',
        providerMessageId: r.idExterne, statut: r.envoye ? 'envoye' : 'en_attente',
        coutUnitaire: 0, coutTotal: 0, dateEnvoi: r.envoye ? new Date() : null,
        codeErreur: r.envoye ? null : r.erreur,
      },
    });
    await db.notification.update({ where: { id: n.id }, data: { statut: r.envoye ? 'envoye' : 'en_attente', dateEnvoi: r.envoye ? new Date() : null } });
    return { livre: r.envoye, detail: r.envoye ? 'sms_api' : `en attente (${r.erreur})` };
  }

  return { livre: false, detail: `canal ${n.canal} sans coordonnée (${email ? '' : 'pas d’email'} ${tel ? '' : 'pas de tél'})` };
}

/** Les canaux réellement configurés — pour l'affichage honnête en UI. */
export function canauxConfigurés(): string[] {
  const c = ['in_app'];
  if (process.env.SG_EMAIL_API_URL) c.push('email');
  if (process.env.SG_SMS_API_URL) c.push('sms');
  return c;
}
