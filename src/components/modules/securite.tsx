'use client';

// ====================================================================
// Module Sécurité physique — visiteurs, autorisations de sortie,
// sorties anticipées (avec validation exceptionnelle + notification parents)
// ====================================================================

import { useTransition } from 'react';
import { Shield, UserCheck, LogOut, AlertTriangle, KeyRound } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, ModalForm, CreateButton, SectionBlock } from '@/components/shared-ui';
import * as actions from '@/app/actions';
import { formatDate, formatDateTime } from '@/lib/format';

export default function SecuriteModule({ initialData }: { initialData: any }) {
  const visiteurs = initialData.visiteurs ?? [];
  const autorisations = initialData.autorisationsSortie ?? [];
  const sorties = initialData.sortiesAnticipees ?? [];
  const eleves = initialData.eleves ?? [];
  const roles = initialData.roles ?? [];
  const permissions = initialData.permissions ?? [];
  const rolePermissions = initialData.rolePermissions ?? [];
  const utilisateurRoles = initialData.utilisateurRoles ?? [];
  const utilisateurs = initialData.utilisateurs ?? [];
  const [pending, startTransition] = useTransition();

  const visiteursPresents = visiteurs.filter((v: any) => !v.dateHeureSortie).length;
  const sortiesExceptionnelles = sorties.filter((s: any) => s.validationExceptionnelle).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sécurité physique du site"
        subtitle="Registre visiteurs, autorisations de sortie, sorties anticipées"
        actions={
          <ModalForm
            trigger={<CreateButton label="Enregistrer un visiteur" />}
            title="Enregistrer un visiteur"
            fields={[
              { name: 'nom', label: 'Nom complet', required: true },
              { name: 'motif', label: 'Motif de la visite', required: true },
              { name: 'pieceVerifiee', label: 'Pièce d\'identité vérifiée', type: 'checkbox' },
            ]}
            action={actions.enregistrerVisiteur}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Visiteurs présents" value={visiteursPresents} icon={UserCheck} color="emerald" />
        <StatCard title="Total visiteurs" value={visiteurs.length} icon={Shield} color="blue" />
        <StatCard title="Autorisations actives" value={autorisations.filter((a: any) => a.active).length} icon={UserCheck} color="purple" />
        <StatCard title="Sorties exceptionnelles" value={sortiesExceptionnelles} sub="validation double requise" icon={AlertTriangle} color="rose" />
      </div>

      <SectionBlock title="Registre des visiteurs" description="Entrées et sorties tracées à l'accueil">
        <DataTable
          columns={[
            { key: 'nom', label: 'Nom' },
            { key: 'motifVisite', label: 'Motif' },
            { key: 'badgeNumero', label: 'Badge' },
            { key: 'pieceIdentiteVerifiee', label: 'PI vérifiée', render: (v) => v.pieceIdentiteVerifiee ? <span className="text-emerald-600 text-xs">✓</span> : <span className="text-rose-600 text-xs">✗</span> },
            { key: 'dateHeureEntree', label: 'Entrée', render: (v) => formatDateTime(v.dateHeureEntree) },
            { key: 'dateHeureSortie', label: 'Sortie', render: (v) => v.dateHeureSortie ? formatDateTime(v.dateHeureSortie) : <span className="text-emerald-600 text-xs">Présent</span> },
          ]}
          rows={visiteurs}
          emptyLabel="Aucun visiteur enregistré"
        />
      </SectionBlock>

      <SectionBlock title="Autorisations de sortie" description="Personnes autorisées à récupérer les élèves">
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (a) => { const e = eleves.find((x: any) => x.id === a.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'nomPersonneAutorisee', label: 'Personne autorisée' },
            { key: 'lienAvecEleve', label: 'Lien' },
            { key: 'telephone', label: 'Téléphone' },
            { key: 'active', label: 'Statut', render: (a) => a.active ? <StatusBadge statut="actif" /> : <StatusBadge statut="resilie" /> },
          ]}
          rows={autorisations}
          emptyLabel="Aucune autorisation de sortie"
        />
      </SectionBlock>

      <SectionBlock
        title="Sorties anticipées"
        description="Toute sortie non pré-autorisée déclenche une double validation + notification immédiate aux parents"
        action={
          <ModalForm
            trigger={<CreateButton label="Enregistrer une sortie" />}
            title="Enregistrer une sortie anticipée"
            fields={[
              { name: 'eleveId', label: 'Élève', type: 'select', options: eleves.map((e: any) => ({ value: e.id, label: `${e.prenom} ${e.nom}` })), required: true },
              { name: 'autorisationId', label: 'Autorisation pré-existante (optionnel)', type: 'select', options: autorisations.filter((a: any) => a.active).map((a: any) => ({ value: a.id, label: a.nomPersonneAutorisee })) },
              { name: 'recupereParNom', label: 'Récupéré par (nom)', required: true },
              { name: 'date', label: 'Date', type: 'date', required: true },
              { name: 'heure', label: 'Heure', required: true, placeholder: '15:30' },
            ]}
            action={actions.sortieEleve}
          />
        }
      >
        <DataTable
          columns={[
            { key: 'eleve', label: 'Élève', render: (s) => { const e = eleves.find((x: any) => x.id === s.eleveId); return e ? `${e.prenom} ${e.nom}` : '—'; } },
            { key: 'recupereParNom', label: 'Récupéré par' },
            { key: 'date', label: 'Date', render: (s) => formatDate(s.date) },
            { key: 'heure', label: 'Heure' },
            { key: 'validationExceptionnelle', label: 'Type', render: (s) => s.validationExceptionnelle ? <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">Exceptionnelle</Badge> : <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Pré-autorisée</Badge> },
            { key: 'parentsNotifies', label: 'Parents notifiés', render: (s) => s.parentsNotifies ? <span className="text-emerald-600 text-xs">✓</span> : '—' },
          ]}
          rows={sorties}
          emptyLabel="Aucune sortie anticipée enregistrée"
        />
      </SectionBlock>

      <SectionBlock
        title="Habilitations & rôles (RBAC)"
        description="Matrice des permissions par rôle et utilisateurs habilités"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Permission</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Module</th>
                {roles.map((r: any) => (
                  <th key={r.id} className="py-2 px-3 font-medium text-gray-700 text-center">{r.libelle}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{p.libelle}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{p.code}</div>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{p.module}</td>
                  {roles.map((r: any) => {
                    const has = rolePermissions.some((rp: any) => rp.roleId === r.id && rp.permissionId === p.id);
                    return (
                      <td key={r.id} className="py-2 px-3 text-center">
                        {has ? <span className="text-emerald-600">✓</span> : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Utilisateurs par rôle</h4>
          <div className="flex flex-wrap gap-2">
            {utilisateurRoles.map((ur: any) => {
              const u = utilisateurs.find((x: any) => x.id === ur.utilisateurId);
              const r = roles.find((x: any) => x.id === ur.roleId);
              if (!u || !r) return null;
              return (
                <Badge key={`${ur.utilisateurId}-${ur.roleId}`} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  <KeyRound className="h-3 w-3 mr-1" />{u.prenom} {u.nom} — {r.libelle}
                </Badge>
              );
            })}
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
