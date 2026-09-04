'use client';

// E21 — FORMULAIRE PUBLIC DE CANDIDATURE (sans compte)
// Accessible : /admission?ecole=<slug> — honeypot + throttle IP côté serveur.

import { useState, useTransition } from 'react';
import { GraduationCap, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as ext from '@/app/actions/completions';

export default function PageAdmissionPublique() {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const slug = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('ecole') ?? 'vinci'
    : 'vinci';

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const fd = new FormData(e.currentTarget);
    fd.set('ecoleSlug', slug);
    startTransition(async () => {
      const r = await ext.envoyerCandidaturePublique(fd);
      if (r && r.ok === false) { setErreur(r.error); return; }
      setSucces(true);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle>Candidature d&apos;admission</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Pré-inscription en ligne — l&apos;école vous recontactera</p>
        </CardHeader>
        <CardContent>
          {succes ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="font-medium">Candidature envoyée ✓</p>
              <p className="text-sm text-gray-500">Votre dossier a été transmis à l&apos;administration. Vous serez contacté(e) pour la suite (test d&apos;admission, entretien).</p>
            </div>
          ) : (
            <form onSubmit={envoyer} className="space-y-3">
              {erreur && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  <AlertCircle className="h-4 w-4 mt-0.5" /><span>{erreur}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="prenom">Prénom *</Label><Input id="prenom" name="prenom" required /></div>
                <div className="space-y-1.5"><Label htmlFor="nom">Nom *</Label><Input id="nom" name="nom" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="dateNaissance">Date de naissance *</Label><Input id="dateNaissance" name="dateNaissance" type="date" required /></div>
                <div className="space-y-1.5"><Label htmlFor="niveauCode">Niveau souhaité</Label>
                  <select id="niveauCode" name="niveauCode" className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 text-sm">
                    <option value="">— Choisir —</option>
                    {['CP','CE1','CE2','CM1','CM2','6E','5E','4E','3E','2NDE','1ERE','TLE'].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="email">Email (parent) *</Label><Input id="email" name="email" type="email" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="telephone">Téléphone</Label><Input id="telephone" name="telephone" /></div>
                <div className="space-y-1.5"><Label htmlFor="parentNom">Nom du parent</Label><Input id="parentNom" name="parentNom" /></div>
              </div>
              {/* Honeypot invisible : les bots le remplissent, pas les humains */}
              <input type="text" name="pieger" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={pending}>
                <Send className="h-4 w-4 mr-2" />{pending ? 'Envoi…' : 'Envoyer la candidature'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
