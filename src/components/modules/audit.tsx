'use client';

// ====================================================================
// Module Journal d'audit — traçabilité exhaustive immuable
// ====================================================================

import { ScrollText, Activity, ShieldAlert } from 'lucide-react';
import { PageHeader, StatCard, DataTable, SectionBlock } from '@/components/shared-ui';
import { formatDateTime } from '@/lib/format';

export default function AuditModule({ initialData }: { initialData: any }) {
  const logs = initialData.auditLogs ?? [];
  const utilisateurs = initialData.utilisateurs ?? [];

  // KPIs
  const actionsSensibles = logs.filter((l: any) => /paiement|note|support|bulletin|sanction/.test(l.action)).length;
  const supportConnexions = logs.filter((l: any) => l.action === 'support.connexion_en_tant_que').length;
  const dernieres24h = logs.filter((l: any) => {
    const d = new Date(l.dateAction);
    return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader title="Journal d'audit" subtitle="Traçabilité exhaustive, immuable, de toutes les actions sensibles" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total actions" value={logs.length} icon={Activity} color="emerald" />
        <StatCard title="Actions sensibles" value={actionsSensibles} sub="paiements, notes, bulletins" icon={ShieldAlert} color="rose" />
        <StatCard title="Connexions support" value={supportConnexions} sub="tracées et visibles par la direction" icon={ShieldAlert} color="amber" />
        <StatCard title="Dernières 24h" value={dernieres24h} icon={Activity} color="blue" />
      </div>

      <SectionBlock
        title="Journal d'audit complet"
        description="Toute action sensible (note, paiement, accès support, changement de statut) est horodatée, attribuée, historisée de façon immuable"
      >
        <DataTable
          columns={[
            { key: 'dateAction', label: 'Date/Heure', render: (l) => formatDateTime(l.dateAction) },
            { key: 'utilisateur', label: 'Utilisateur', render: (l) => { const u = utilisateurs.find((x: any) => x.id === l.utilisateurId); return u ? `${u.prenom} ${u.nom}` : l.utilisateurId ?? 'Système'; } },
            { key: 'action', label: 'Action', render: (l) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-emerald-700">{l.action}</code> },
            { key: 'cibleType', label: 'Type cible' },
            { key: 'cibleId', label: 'ID cible', render: (l) => l.cibleId ? <code className="text-xs text-gray-500">{l.cibleId.slice(-8)}</code> : '—' },
            { key: 'details', label: 'Détails', render: (l) => l.details ? <code className="text-xs text-gray-500 line-clamp-1">{l.details}</code> : '—' },
          ]}
          rows={[...logs].reverse()}
          emptyLabel="Aucune action tracée"
        />
      </SectionBlock>

      <SectionBlock title="Principes de conformité" description="Règles non négociables de la plateforme">
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { titre: 'Traçabilité intégrale', desc: 'Toute action sensible est horodatée, attribuée et historisée de façon immuable dans le journal d\'audit.' },
            { titre: 'Transparence vis-à-vis des écoles', desc: 'Toute connexion du support éditeur "en tant que" une école est tracée dans le journal d\'audit de cette école, visible par la direction.' },
            { titre: 'Protection des mineurs', desc: 'Consentement parental explicite requis pour activer le portail élève. Visibilité strictement limitée par rôle.' },
            { titre: 'Purge automatique et journalisée', desc: 'Durée de conservation paramétrable par type de donnée. Toute purge est tracée.' },
          ].map(p => (
            <div key={p.titre} className="p-3 border border-gray-200 rounded bg-gray-50">
              <h3 className="text-sm font-medium">{p.titre}</h3>
              <p className="text-xs text-gray-600 mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}
