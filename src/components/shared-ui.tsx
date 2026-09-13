'use client';

// Composants UI partagés utilisés par tous les modules.

import { ReactNode, useCallback, useState, useTransition, isValidElement, cloneElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X, Eye, Pencil, ChevronDown } from 'lucide-react';
import { statutColor, statutLabel } from '@/lib/format';

// --------------------------------------------------------------------
// F5.3 — feedback uniforme des actions directes (boutons useTransition) :
// finies les erreurs avalées silencieusement. Retourne { run, message, pending }.
// --------------------------------------------------------------------
export function useActionFeedback() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    (fn: () => Promise<{ ok: boolean; error?: string } | null | undefined>, succes: string) => {
      setMessage(null);
      startTransition(async () => {
        try {
          const r = await fn();
          setMessage(r && r.ok === false ? `✗ ${r.error ?? 'Opération refusée.'}` : `✓ ${succes}`);
        } catch {
          setMessage('✗ Une erreur est survenue. Réessayez.');
        }
      });
    },
    [startTransition],
  );
  return { run, message, pending, Message: message ? <div role="status" className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">{message}</div> : null };
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ title, value, sub, icon, color = 'emerald' }: { title: string; value: ReactNode; sub?: string; icon?: any; color?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  // Tolère les DEUX conventions d'appel : composant (icon={Wallet}) et
  // élément déjà instancié (icon={<Wallet className/>}) — sinon le rendu
  // crash (« Element type is invalid ») dans les portails parent/élève.
  const Icon = typeof icon === 'function' || typeof icon === 'string' ? icon : null;
  const icone = isValidElement(icon) ? icon : Icon ? <Icon className="h-5 w-5" /> : null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
          {icone && (
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
              {cloneElement(icone as any, { className: 'h-5 w-5' })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ statut, label }: { statut: string; label?: string }) {
  return <Badge variant="outline" className={`text-xs ${statutColor(statut)}`}>{label ?? statutLabel(statut)}</Badge>;
}

export function DataTable({ columns, rows, emptyLabel = 'Aucune donnée', total, onLoadMore, loadingMore }: {
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  rows: any[];
  emptyLabel?: string;
  total?: number; // F14 — compte total serveur quand la liste est plafonnée
  onLoadMore?: () => void; // F14 — charger la suite (action paginée)
  loadingMore?: boolean;
}) {
  const plafonne = typeof total === 'number' && rows.length < total;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            <TableRow>
              {columns.map(c => <TableHead key={c.key} className="text-xs font-semibold uppercase tracking-wider text-gray-600">{c.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-gray-500 py-8">{emptyLabel}</TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <TableRow key={r.id ?? i}>
                {columns.map(c => (
                  <TableCell key={c.key} className="text-sm">
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(plafonne || typeof total === 'number') && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span>
            {rows.length} affiché(s){typeof total === 'number' ? ` sur ${total}` : ''}
          </span>
          {plafonne && onLoadMore && (
            <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loadingMore}>
              <ChevronDown className="h-4 w-4 mr-1" />
              {loadingMore ? 'Chargement…' : 'Charger plus'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function FormField({ label, children, required, hidden }: { label: string; children: ReactNode; required?: boolean; hidden?: boolean }) {
  if (hidden) {
    return <>{children}</>;
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-700">{label} {required && <span className="text-rose-500">*</span>}</Label>
      {children}
    </div>
  );
}

type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'datetime-local' | 'month' | 'select' | 'textarea' | 'checkbox' | 'hidden' | 'email' | 'password';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  step?: string;
};

export function ModalForm({
  trigger, title, fields, action, defaultValues,
}: {
  trigger: ReactNode;
  title: string;
  fields: FieldDef[];
  action: (formData: FormData) => Promise<any>;
  defaultValues?: Record<string, any>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const valueOf = (f: FieldDef) => defaultValues?.[f.name] ?? f.defaultValue;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setErreur(null);
    startTransition(async () => {
      const resultat = await action(formData);
      if (resultat && resultat.ok === false) {
        // L'opération a été REFUSÉE (validation/règle métier) : on affiche
        // l'erreur et on garde le formulaire ouvert pour correction.
        setErreur(resultat.error ?? 'Opération refusée.');
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {erreur && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {erreur}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(f => (
            <FormField key={f.name} label={f.label} required={f.required} hidden={f.type === 'hidden'}>
              {f.type === 'textarea' ? (
                <Textarea name={f.name} placeholder={f.placeholder} defaultValue={valueOf(f)} required={f.required} />
              ) : f.type === 'select' ? (
                <select
                  name={f.name}
                  defaultValue={valueOf(f) ?? ''}
                  required={f.required}
                  className="w-full h-9 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Choisir —</option>
                  {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <Checkbox name={f.name} defaultChecked={valueOf(f)} />
              ) : (
                <Input
                  type={f.type ?? 'text'}
                  name={f.name}
                  placeholder={f.placeholder}
                  defaultValue={valueOf(f)}
                  required={f.required}
                  step={f.step ?? (f.type === 'number' ? '0.01' : undefined)}
                />
              )}
            </FormField>
          ))}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>Annuler</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="bg-emerald-600 hover:bg-emerald-700">
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SectionBlock({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value ?? '—'}</dd>
    </div>
  );
}

export const CreateButton = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={onClick}>
    <Plus className="h-4 w-4" /> {label}
  </Button>
);

export { Plus, X, Eye, Pencil };
