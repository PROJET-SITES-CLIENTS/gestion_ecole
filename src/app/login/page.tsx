'use client';

// ====================================================================
// PAGE DE CONNEXION
// - Sessions 8 h, cookie HttpOnly, verrouillage après 5 échecs
// - F10 : défi 2FA (code TOTP à 6 chiffres ou code de secours) quand
//   le compte a la double authentification active
// - F2 : les comptes de démonstration ne sont affichés QUE si le
//   serveur l'autorise (développement / flag SG_AFFICHER_COMPTES_DEMO).
//   En production : aucun indice public, aucun mot de passe affiché.
// ====================================================================

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as actions from '@/app/actions';
import * as ext from '@/app/actions/extensions';

const COMPTES_DEMO = [
  { role: 'Super-Admin éditeur', email: 'editeur@platforme.com' },
  { role: 'Direction (vue 360° totale)', email: 'direction@vinci.sn' },
  { role: 'Comptabilité', email: 'comptable@vinci.sn' },
  { role: 'Ressources Humaines', email: 'rh@vinci.sn' },
  { role: 'Censeur (vie scolaire)', email: 'censeur@vinci.sn' },
  { role: 'Surveillant général', email: 'surveillant@vinci.sn' },
  { role: 'Secrétariat', email: 'secretariat@vinci.sn' },
  { role: 'Assistant de direction', email: 'assistant@vinci.sn' },
  { role: 'Infirmière', email: 'infirmiere@vinci.sn' },
  { role: 'Enseignant', email: 'mamadou.fall@vinci.sn' },
  { role: 'Parent', email: 'parent.pape@gmail.com' },
  { role: 'Élève', email: 'eleve.diop@vinci.sn' },
];

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  // F2 — visibilité des comptes démo décidée côté serveur (jamais codée en dur)
  const [afficherDemo, setAfficherDemo] = useState(false);

  useEffect(() => {
    fetch('/api/config-login')
      .then((r) => (r.ok ? r.json() : { demo: false }))
      .then((d) => setAfficherDemo(Boolean(d?.demo)))
      .catch(() => setAfficherDemo(false));
  }, []);

  // F10 — défi 2FA
  const [jetonChallenge, setJetonChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');

  // A4 — « Mot de passe oublié ? » : demande de réinitialisation.
  // En dev, le jeton revient dans la réponse (pas d'email envoyé) :
  // on propose alors la saisie du nouveau mot de passe directement.
  const [oubliOuvert, setOubliOuvert] = useState(false);
  const [oubliEmail, setOubliEmail] = useState('');
  const [oubliMessage, setOubliMessage] = useState<string | null>(null);
  const [oubliErreur, setOubliErreur] = useState<string | null>(null);
  const [jetonDev, setJetonDev] = useState<string | null>(null);
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [pendingOubli, startOubli] = useTransition();

  function ouvrirOubli() {
    setOubliOuvert(true);
    setOubliEmail(email);
    setOubliMessage(null);
    setOubliErreur(null);
    setJetonDev(null);
    setNouveauMdp('');
  }

  function demanderLien(e?: React.FormEvent) {
    e?.preventDefault();
    setOubliMessage(null);
    setOubliErreur(null);
    startOubli(async () => {
      const r = await ext.demanderReinitialisation(oubliEmail);
      if (r && r.ok === false) {
        setOubliErreur(r.error ?? 'Demande refusée.');
        return;
      }
      setOubliMessage('Si un compte existe pour cet email, un lien de réinitialisation vient d\'être envoyé (valide une heure).');
      if (r && typeof r.jeton === 'string' && r.jeton) setJetonDev(r.jeton);
    });
  }

  function poserNouveauMdp(e?: React.FormEvent) {
    e?.preventDefault();
    setOubliErreur(null);
    if (nouveauMdp.length < 8) {
      setOubliErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    startOubli(async () => {
      if (!jetonDev) return;
      const r = await ext.reinitialiserMotDePasse(jetonDev, nouveauMdp);
      if (r && r.ok === false) {
        setOubliErreur(r.error ?? 'Réinitialisation refusée.');
        return;
      }
      setOubliMessage('Mot de passe réinitialisé — vous pouvez vous connecter avec le nouveau mot de passe.');
      setJetonDev(null);
      setNouveauMdp('');
      setMotDePasse('');
    });
  }

  function seConnecter(e?: React.FormEvent) {
    e?.preventDefault();
    setErreur(null);
    const fd = new FormData();
    fd.set('email', email);
    fd.set('motDePasse', motDePasse);
    startTransition(async () => {
      const r = await actions.connexion(fd);
      if (r && r.ok === false) {
        if ('besoin2FA' in r && r.besoin2FA) {
          setJetonChallenge(r.jetonChallenge);
          return;
        }
        if ('error' in r) {
          setErreur(r.error ?? 'Connexion refusée.');
          return;
        }
        setErreur('Connexion refusée.');
        return;
      }
      router.replace('/');
      router.refresh();
    });
  }

  function validerCode(e?: React.FormEvent) {
    e?.preventDefault();
    setErreur(null);
    startTransition(async () => {
      if (!jetonChallenge) return;
      const r = await actions.valider2FA(jetonChallenge, code);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Code refusé.');
        return;
      }
      setJetonChallenge(null);
      router.replace('/');
      router.refresh();
    });
  }

  function remplirCompte(mail: string) {
    setEmail(mail);
    setMotDePasse('');
    setErreur(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Formulaire */}
        <Card className="w-full">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-3">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">ScolaGestion V4</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Plateforme SaaS de gestion scolaire</p>
          </CardHeader>
          <CardContent>
            {oubliOuvert ? (
              // ---- A4 : mot de passe oublié ----
              <div className="space-y-4">
                {oubliErreur && (
                  <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{oubliErreur}</span>
                  </div>
                )}
                {oubliMessage && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                    {oubliMessage}
                  </div>
                )}
                {jetonDev ? (
                  <form onSubmit={poserNouveauMdp} className="space-y-4">
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Environnement de développement — le lien n&apos;est pas envoyé par email. Jeton reçu :
                      <code className="mt-1 block font-mono text-[11px] bg-white rounded border px-2 py-1 break-all select-all">{jetonDev}</code>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nouveau-mdp">Nouveau mot de passe (8 caractères min.)</Label>
                      <Input
                        id="nouveau-mdp"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={nouveauMdp}
                        onChange={(e) => setNouveauMdp(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pendingOubli}>
                      {pendingOubli ? 'Enregistrement…' : 'Définir le nouveau mot de passe'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={demanderLien} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="oubli-email">Adresse email du compte</Label>
                      <div className="relative">
                        <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="oubli-email"
                          type="email"
                          autoComplete="email"
                          placeholder="prenom.nom@vinci.sn"
                          className="pl-9"
                          value={oubliEmail}
                          onChange={(e) => setOubliEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pendingOubli}>
                      {pendingOubli ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
                    </Button>
                  </form>
                )}
                <button
                  type="button"
                  className="w-full text-xs text-gray-500 hover:text-gray-700 underline"
                  onClick={() => { setOubliOuvert(false); setJetonDev(null); setOubliMessage(null); setOubliErreur(null); }}
                >
                  ← Revenir à la connexion
                </button>
              </div>
            ) : jetonChallenge ? (
              // ---- F10 : défi 2FA ----
              <form onSubmit={validerCode} className="space-y-4">
                {erreur && (
                  <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{erreur}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  <span>Double authentification requise — saisissez le code à 6 chiffres de votre application d&apos;authentification (ou un code de secours).</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code de vérification</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="text-center text-lg tracking-[0.4em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {pending ? 'Vérification…' : 'Vérifier et se connecter'}
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-gray-500 hover:text-gray-700 underline"
                  onClick={() => { setJetonChallenge(null); setCode(''); setErreur(null); }}
                >
                  ← Revenir à la saisie du mot de passe
                </button>
              </form>
            ) : (
              <form onSubmit={seConnecter} className="space-y-4">
                {erreur && (
                  <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{erreur}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="prenom.nom@vinci.sn"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motDePasse">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="motDePasse"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
                  <LogIn className="h-4 w-4 mr-2" />
                  {pending ? 'Connexion…' : 'Se connecter'}
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-emerald-700 hover:text-emerald-800 underline"
                  onClick={ouvrirOubli}
                >
                  Mot de passe oublié ?
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Session sécurisée 8 h · verrouillage automatique après 5 tentatives échouées · protection 2FA
              <div className="text-center pt-1">
                <a href="/inscription" className="text-sm text-emerald-600 hover:underline font-medium">
                  Pas encore de compte ? Demander un accès →
                </a>
              </div>
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Comptes démo — F2 : affichés uniquement si le serveur l'autorise */}
        {afficherDemo && (
          <Card className="w-full bg-emerald-50/50 border-emerald-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comptes de démonstration</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Cliquez sur un compte pour pré-remplir l&apos;email — le mot de passe vous a été communiqué
                (variable d&apos;environnement <code className="px-1 py-0.5 bg-white rounded border">SG_MDP_DEMO</code>).
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMPTES_DEMO.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => remplirCompte(c.email)}
                  className="w-full flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-3 py-2 text-left text-sm hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{c.role}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">remplir →</span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
