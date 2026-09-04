'use client';

// ====================================================================
// FORMULAIRE D'INSCRIPTION — 2 modes
//  • création  : directeur → école + compte admin ACTIF + connexion
//  • accès     : membre → demande en file d'attente (validation admin)
// ====================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, CheckCircle2, AlertCircle, LogIn, School, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as ext from '@/app/actions/completions';

type EcolePublique = { slug: string; nom: string };
type Mode = 'creation' | 'acces';

export function FormulaireInscription({ ecoles }: { ecoles: EcolePublique[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [type, setType] = useState<'personnel' | 'parent' | 'eleve'>('parent');
  const aucuneEcole = ecoles.length === 0;
  const [mode, setMode] = useState<Mode>(aucuneEcole ? 'creation' : 'acces');
  const slugInitial = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('ecole') ?? ecoles[0]?.slug ?? 'vinci'
    : ecoles[0]?.slug ?? 'vinci';

  // ─── MODE CRÉATION : école + administrateur (actif immédiatement) ───
  function creerEcole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await ext.initialiserEcole(fd);
      if (r && r.ok === false) { setErreur(r.error); return; }
      // Session créée par le serveur → accès direct à l'interface
      router.push('/');
      router.refresh();
    });
  }

  // ─── MODE ACCÈS : demande transmise à l'administrateur ───
  function inscrire(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    fd.set('type', type);
    startTransition(async () => {
      const r = await ext.demanderComptePublic(fd);
      if (r && r.ok === false) { setErreur(r.error); return; }
      setSucces(true);
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
          <UserPlus className="h-6 w-6" />
        </div>
        <CardTitle>{mode === 'creation' ? 'Créer votre école' : "Demande d'accès"}</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          {mode === 'creation'
            ? "Vous serez l'administrateur : votre compte est actif immédiatement"
            : 'Votre compte sera activé après validation par la direction'}
        </p>
      </CardHeader>
      <CardContent>
        {/* Sélecteur de mode — l'admin doit être PREMIER, donc la création
            n'est proposée qu'aux écoles pas encore inscrites sur la plateforme */}
        {!aucuneEcole && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([['acces', 'Demander un accès'], ['creation', 'Créer mon école']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => { setMode(v); setErreur(null); setSucces(false); }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:border-emerald-300'}`}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* ═══ ÉTAT : demande d'accès envoyée ═══ */}
        {succes && mode === 'acces' ? (
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
        ) : mode === 'creation' ? (
          /* ═══ MODE CRÉATION : école + compte administrateur ═══ */
          <form onSubmit={creerEcole} className="space-y-3">
            {aucuneEcole && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                🎉 <strong>Première installation</strong> — aucune école n&apos;est encore
                inscrite. Créez la vôtre : vous en deviendrez l&apos;administrateur.
              </div>
            )}
            {erreur && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                <AlertCircle className="h-4 w-4 mt-0.5" /><span>{erreur}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nomEcole" className="flex items-center gap-1.5">
                <School className="h-3.5 w-3.5" />Nom de l&apos;établissement *
              </Label>
              <Input id="nomEcole" name="nomEcole" placeholder="Ex : Cours Bayard" required />
            </div>

            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                L&apos;administrateur (vous)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="adminPrenom">Prénom *</Label><Input id="adminPrenom" name="adminPrenom" required /></div>
              <div className="space-y-1.5"><Label htmlFor="adminNom">Nom *</Label><Input id="adminNom" name="adminNom" required /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" required /></div>
            <div className="space-y-1.5">
              <Label htmlFor="motDePasse">Mot de passe * <span className="text-xs text-gray-400">(8 caractères min.)</span></Label>
              <Input id="motDePasse" name="motDePasse" type="password" minLength={8} required />
            </div>

            <input type="text" name="pieger" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <School className="h-4 w-4 mr-2" />}
              {pending ? 'Création en cours…' : 'Créer mon école et démarrer'}
            </Button>
            <p className="text-xs text-center text-gray-400">
              Votre école est créée avec sa structure complète (année en cours, trimestres,
              niveaux, classes). Vous accédez immédiatement à l&apos;interface d&apos;administration.
            </p>
            {!aucuneEcole && (
              <div className="text-center">
                <button type="button" className="text-sm text-emerald-600 hover:underline" onClick={() => { setMode('acces'); setErreur(null); }}>
                  Mon école est déjà inscrite — demander un accès
                </button>
              </div>
            )}
          </form>
        ) : (
          /* ═══ MODE ACCÈS : formulaire existant + sélecteur d'école ═══ */
          <form onSubmit={inscrire} className="space-y-3">
            {erreur && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                <AlertCircle className="h-4 w-4 mt-0.5" /><span>{erreur}</span>
              </div>
            )}

            {/* Établissement */}
            <div className="space-y-1.5">
              <Label htmlFor="ecoleSlug">Établissement *</Label>
              <select id="ecoleSlug" name="ecoleSlug" defaultValue={slugInitial}
                className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 text-sm" required>
                {ecoles.map((ec) => <option key={ec.slug} value={ec.slug}>{ec.nom}</option>)}
              </select>
            </div>

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
              <button type="button" className="text-sm text-emerald-600 hover:underline" onClick={() => { setMode('creation'); setErreur(null); }}>
                Votre école n&apos;est pas encore inscrite ? Créer votre école
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-4 pt-3 border-t">
          <button type="button" className="text-sm text-gray-500 hover:text-emerald-600 hover:underline" onClick={() => router.push('/login')}>
            J&apos;ai déjà un compte — me connecter
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
