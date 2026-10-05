'use client';

// ====================================================================
// DESIGN SYSTEM PREMIUM — ScolaGestion v2
// Composants partagés : épurés, raffinés, ultra haut de gamme.
// Palette indigo/violet, glassmorphism, micro-animations.
// ====================================================================

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
import { Plus, X, Eye, Pencil, ChevronDown, Inbox } from 'lucide-react';
import { statutColor, statutLabel } from '@/lib/format';

// --------------------------------------------------------------------
// FEEDBACK — retour visuel premium des actions
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
  return {
    run, message, pending,
    Message: message ? (
      <div
        role="status"
        className={`animate-fade-up rounded-xl border px-4 py-2.5 text-sm font-medium backdrop-blur-sm ${
          message.startsWith('✓')
            ? 'border-emerald-200/60 bg-emerald-50/80 text-emerald-700 shadow-[0_2px_12px_rgba(16,185,129,0.08)]'
            : 'border-rose-200/60 bg-rose-50/80 text-rose-700 shadow-[0_2px_12px_rgba(239,68,68,0.08)]'
        }`}
      >
        {message}
      </div>
    ) : null,
  };
}

// --------------------------------------------------------------------
// PAGE HEADER — titre avec gradient subtil
// --------------------------------------------------------------------
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="animate-fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block h-8 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
          <div>
            <h1 className="text-[1.65rem] font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight">
              {title}
            </h1>
            {subtitle && <p className="hidden sm:block text-[0.82rem] text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// --------------------------------------------------------------------
// STAT CARD — premium avec icône en dégradé et hover lift
// --------------------------------------------------------------------
export function StatCard({ title, value, sub, icon, color = 'indigo' }: { title: string; value: ReactNode; sub?: string; icon?: any; color?: string }) {
  const gradients: Record<string, { bg: string; icon: string; glow: string }> = {
    indigo: { bg: 'from-indigo-500/10 to-violet-500/5', icon: 'from-indigo-500 to-violet-500', glow: 'shadow-[0_4px_16px_rgba(99,102,241,0.15)]' },
    emerald: { bg: 'from-emerald-500/10 to-teal-500/5', icon: 'from-emerald-500 to-teal-500', glow: 'shadow-[0_4px_16px_rgba(16,185,129,0.15)]' },
    rose: { bg: 'from-rose-500/10 to-pink-500/5', icon: 'from-rose-500 to-pink-500', glow: 'shadow-[0_4px_16px_rgba(239,68,68,0.15)]' },
    amber: { bg: 'from-amber-500/10 to-orange-500/5', icon: 'from-amber-500 to-orange-500', glow: 'shadow-[0_4px_16px_rgba(245,158,11,0.15)]' },
    blue: { bg: 'from-blue-500/10 to-cyan-500/5', icon: 'from-blue-500 to-cyan-500', glow: 'shadow-[0_4px_16px_rgba(59,130,246,0.15)]' },
    purple: { bg: 'from-purple-500/10 to-fuchsia-500/5', icon: 'from-purple-500 to-fuchsia-500', glow: 'shadow-[0_4px_16px_rgba(168,85,247,0.15)]' },
    gray: { bg: 'from-slate-400/10 to-slate-500/5', icon: 'from-slate-500 to-slate-600', glow: '' },
  };
  const g = gradients[color] ?? gradients.indigo;
  const Icon = typeof icon === 'function' || typeof icon === 'string' ? icon : null;
  const icone = isValidElement(icon) ? icon : Icon ? <Icon className="h-[1.15rem] w-[1.15rem]" /> : null;
  return (
    <div className={`premium-card ${g.glow} p-5`}>
      <div className={`absolute inset-0 rounded-[inherit] bg-gradient-to-br ${g.bg} pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] text-slate-500 font-semibold uppercase tracking-[0.08em]">{title}</p>
          <p className="text-[1.7rem] font-bold tracking-tight text-slate-900 mt-1.5 leading-none tabular-nums">{value}</p>
          {sub && <p className="text-[0.72rem] text-slate-400 mt-1.5 font-medium">{sub}</p>}
        </div>
        {icone && (
          <div className={`flex-shrink-0 h-11 w-11 rounded-[0.8rem] bg-gradient-to-br ${g.icon} flex items-center justify-center text-white shadow-lg`}>
            {cloneElement(icone as any, { className: 'h-[1.15rem] w-[1.15rem]' })}
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// STATUS BADGE — pill avec glow
// --------------------------------------------------------------------
export function StatusBadge({ statut, label }: { statut: string; label?: string }) {
  return <Badge variant="outline" className={`badge-glow text-[0.7rem] font-semibold px-2.5 py-0.5 rounded-full ${statutColor(statut)}`}>{label ?? statutLabel(statut)}</Badge>;
}

// --------------------------------------------------------------------
// DATA TABLE — premium avec header glassmorphe et hover states
// --------------------------------------------------------------------
export function DataTable({ columns, rows, emptyLabel = 'Aucune donnée', total, onLoadMore, loadingMore }: {
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  rows: any[];
  emptyLabel?: string;
  total?: number;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}) {
  const plafonne = typeof total === 'number' && rows.length < total;
  return (
    <div className="rounded-2xl border border-slate-200/70 overflow-hidden bg-white/80 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.03)]">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="border-b border-slate-200/80 [&>th]:bg-slate-50/95 [&>th]:backdrop-blur-sm">
              {columns.map(c => (
                <TableHead key={c.key} className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-slate-500 py-3 px-3">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-14">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">{emptyLabel}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <TableRow
                key={r.id ?? i}
                className="table-row-premium border-b border-slate-100/60 [&>td]:py-2.5 [&>td]:px-3 hover:bg-indigo-50/30"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                {columns.map(c => (
                  <TableCell key={c.key} className="text-[0.82rem] text-slate-700">
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(plafonne || typeof total === 'number') && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 backdrop-blur-sm px-4 py-2.5 text-xs text-slate-500">
          <span className="font-medium tabular-nums">
            {rows.length} affiché(s){typeof total === 'number' ? ` sur ${total}` : ''}
          </span>
          {plafonne && onLoadMore && (
            <Button size="sm" variant="outline" className="h-7 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300" onClick={onLoadMore} disabled={loadingMore}>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              {loadingMore ? 'Chargement…' : 'Charger plus'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------
// FORM FIELD
// --------------------------------------------------------------------
export function FormField({ label, children, required, hidden }: { label: string; children: ReactNode; required?: boolean; hidden?: boolean }) {
  if (hidden) return <>{children}</>;
  return (
    <div className="space-y-1.5">
      <Label className="text-[0.75rem] font-semibold text-slate-600 tracking-wide">{label} {required && <span className="text-rose-400">*</span>}</Label>
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

// --------------------------------------------------------------------
// MODAL FORM — dialog premium avec animation
// --------------------------------------------------------------------
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
        setErreur(resultat.error ?? 'Opération refusée.');
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200/70 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.12)]">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-base font-bold tracking-tight text-slate-800">{title}</DialogTitle>
        </DialogHeader>
        {erreur && (
          <div className="animate-fade-up rounded-xl border border-rose-200/60 bg-rose-50/80 px-3.5 py-2.5 text-sm text-rose-700 backdrop-blur-sm" role="alert">
            {erreur}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {fields.map(f => (
            <FormField key={f.name} label={f.label} required={f.required} hidden={f.type === 'hidden'}>
              {f.type === 'textarea' ? (
                <Textarea name={f.name} placeholder={f.placeholder} defaultValue={valueOf(f)} required={f.required} className="input-premium rounded-xl border-slate-200 text-sm min-h-[72px]" />
              ) : f.type === 'select' ? (
                <select
                  name={f.name}
                  defaultValue={valueOf(f) ?? ''}
                  required={f.required}
                  className="input-premium w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm"
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
                  className="input-premium rounded-xl border-slate-200 text-sm h-10"
                />
              )}
            </FormField>
          ))}
          <DialogFooter className="pt-2 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-9" disabled={pending}>Annuler</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
              className="btn-premium rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] h-9 font-semibold"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement…
                </span>
              ) : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------------
// SECTION BLOCK — carte premium avec header glassmorphe
// --------------------------------------------------------------------
export function SectionBlock({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="premium-card mb-5">
      <div className="flex flex-row items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/50 to-transparent rounded-t-[inherit]">
        <div className="min-w-0">
          <h3 className="text-[0.92rem] font-bold tracking-tight text-slate-800">{title}</h3>
          {description && <p className="text-[0.72rem] text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// --------------------------------------------------------------------
// EMPTY STATE — avec icône et animation
// --------------------------------------------------------------------
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="animate-fade-up text-center py-14 px-6 rounded-2xl border-2 border-dashed border-slate-200/70 bg-gradient-to-b from-slate-50/50 to-transparent">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-50 flex items-center justify-center shadow-inner mb-4">
        <Inbox className="h-6 w-6 text-indigo-300" />
      </div>
      <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
      {description && <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// --------------------------------------------------------------------
// INFO ROW
// --------------------------------------------------------------------
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100/70 last:border-0">
      <dt className="text-[0.78rem] text-slate-400 font-medium">{label}</dt>
      <dd className="text-[0.82rem] font-semibold text-slate-800 text-right">{value ?? '—'}</dd>
    </div>
  );
}

// --------------------------------------------------------------------
// CREATE BUTTON — gradient premium
// --------------------------------------------------------------------
export const CreateButton = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <Button
    size="sm"
    className="btn-premium rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] gap-1.5 font-semibold h-8"
    onClick={onClick}
  >
    <Plus className="h-3.5 w-3.5" /> {label}
  </Button>
);

export { Plus, X, Eye, Pencil };
