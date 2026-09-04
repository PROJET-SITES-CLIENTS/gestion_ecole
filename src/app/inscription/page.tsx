'use client';

// ====================================================================
// PAGE D'INSCRIPTION PUBLIQUE — les visiteurs demandent un compte,
// la direction valide avant que le compte soit actif.
// ====================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as ext from '@/app/actions/completions';

export default function PageInscription() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [type, setType] = useState<'personnel' | 'parent' | 'eleve'>('parent');
  const slug = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('ecole') ?? 'vinci'
    : 'vinci';

  function inscrire(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    fd.set('ecoleSlug', slug);
    fd.set('type', type);
    startTransition(async () => {
      const r = await ext.demanderComptePublic(fd);
      if (r && r.ok === false) { setErreur(r.error); return; }
      setSucces(true);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle>Demande d&apos;accès</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Votre compte sera activé après validation par la direction
          </p>
        </CardHeader>
        <CardContent>
          {succes ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
              <div className="font-medium text-lg">Demande envoyée ✓</div>
              <p className="text-sm text-gray-500">
                Votre demande d&apos;accès a été transmise à l&apos;administration.
                Vous recevrez une notification dès que votre compte sera validé.
              </p>
              <Button variant="outline" onClick={() => router.push('/login')}>
                <LogIn className="h-4 w-4 mr-2" />Retour à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={inscrire} className="space-y-3">
              {erreur && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  <AlertCircle className="h-4 w-4 mt-0.5" /><span>{erreur}</span>
                </div>
              )}

              {/* Type de compte */}
              <div className="space-y-1.5">
                <Label>Je suis…</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([['parent', 'Parent'], ['eleve', 'Élève'], ['personnel', 'Personnel']] as const).map(([v, l]) => (
                    <button key={v} type="button"
                      onClick={() => setType(v)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:border-emerald-300'}`}
                    >{l}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="prenom">Prénom *</Label><Input id="prenom" name="prenom" required /></div>
                <div className="space-y-1.5"><Label htmlFor="nom">Nom *</Label><Input id="nom" name="nom" required /></div>
              </div>

              <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" required /></div>
              <div className="space-y-1.5">
                <Label htmlFor="motDePasse">Mot de passe * <span className="text-xs text-gray-400">(8 caractères min.)</span></Label>
                <Input id="motDePasse" name="motDePasse" type="password" minLength={8} required />
              </div>
              <div className="space-y-1.5"><Label htmlFor="telephone">Téléphone</Label><Input id="telephone" name="telephone" /></div>

              {type === 'personnel' && (
                <div className="space-y-1.5">
                  <Label htmlFor="roleDemande">Rôle souhaité</Label>
                  <select id="roleDemande" name="roleDemande" className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 text-sm" required>
                    <option value="">— Choisir —</option>
                    <option value="enseignant">Enseignant</option>
                    <option value="comptabilite">Comptabilité</option>
                    <option value="rh">Ressources Humaines</option>
                    <option value="censeur">Censeur</option>
                    <option value="surveillant">Surveillant</option>
                    <option value="secretariat">Secrétariat</option>
                    <option value="infirmier">Infirmier(ère)</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="motivation">Pourquoi cet accès ?</Label>
                <textarea id="motivation" name="motivation" rows={2}
                  className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm"
                  placeholder="Ex: Je suis le parent de… / J'enseigne les mathématiques…"
                />
              </div>

              <input type="text" name="pieger" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
                <UserPlus className="h-4 w-4 mr-2" />{pending ? 'Envoi…' : 'Demander mon accès'}
              </Button>
              <p className="text-xs text-center text-gray-400">
                En demandant un accès, vous acceptez que vos informations soient
                traitées par l&apos;établissement dans le cadre de sa gestion scolaire.
              </p>
              <div className="text-center">
                <button type="button" className="text-sm text-emerald-600 hover:underline" onClick={() => router.push('/login')}>
                  J&apos;ai déjà un compte — me connecter
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
