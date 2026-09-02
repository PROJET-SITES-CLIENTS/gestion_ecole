'use client';

// ====================================================================
// PAGE DE CONNEXION — authentification réelle (P0)
// Sessions 8 h, cookie HttpOnly, verrouillage après 5 échecs.
// Comptes de démonstration affichés (seed).
// ====================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Lock, Mail, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as actions from '@/app/actions';

const COMPTES_DEMO = [
  { role: 'Super-Admin éditeur', email: 'editeur@platforme.com' },
  { role: 'Direction', email: 'direction@vinci.sn' },
  { role: 'Enseignant', email: 'mamadou.fall@vinci.sn' },
  { role: 'Parent', email: 'parent.pape@gmail.com' },
  { role: 'Élève', email: 'eleve.diop@vinci.sn' },
];
const MOT_DE_PASSE_DEMO = 'Demo1234!';

export default function LoginPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');

  function seConnecter(e?: React.FormEvent) {
    e?.preventDefault();
    setErreur(null);
    const fd = new FormData();
    fd.set('email', email);
    fd.set('motDePasse', motDePasse);
    startTransition(async () => {
      const r = await actions.connexion(fd);
      if (r && r.ok === false) {
        setErreur(r.error ?? 'Connexion refusée.');
        return;
      }
      router.replace('/');
      router.refresh();
    });
  }

  function remplirCompte(mail: string) {
    setEmail(mail);
    setMotDePasse(MOT_DE_PASSE_DEMO);
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
              <p className="text-xs text-gray-400 text-center">
                Session sécurisée 8 h · verrouillage automatique après 5 tentatives échouées
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Comptes démo */}
        <Card className="w-full bg-emerald-50/50 border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comptes de démonstration</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Cliquez sur un compte pour remplir le formulaire — mot de passe commun : <code className="px-1 py-0.5 bg-white rounded border">{MOT_DE_PASSE_DEMO}</code>
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
      </div>
    </div>
  );
}
