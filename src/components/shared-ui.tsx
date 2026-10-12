'use client';

// ====================================================================
// INSTITUTIONAL DESIGN SYSTEM — ScolaGestion v5
// Inspiré de Stripe / Notion / Linear : raffiné, sobre, professionnel.
// ====================================================================

import { ReactNode, useCallback, useState, useTransition, isValidElement, cloneElement } from 'react';
import { motion } from 'motion/react';
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
import { CountUp } from '@/components/fx';

// ── FEEDBACK ──
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
        className={`animate-pop-in rounded-lg border px-4 py-2.5 text-sm font-medium ${
          message.startsWith('✓')
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}
      >
        {message}
      </div>
    ) : null,
  };
}

// ── PAGE HEADER ──
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="fx-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-slate-200 pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="text-[0.8rem] text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ── STAT CARD — fond blanc, icône teintée, sobre ──
const STAT_TINTES: Record<string, { iconBg: string; iconText: string; accent: string }> = {
  electric: { iconBg: 'bg-blue-50', iconText: 'text-blue-600', accent: 'text-blue-600' },
  blue: { iconBg: 'bg-blue-50', iconText: 'text-blue-600', accent: 'text-blue-600' },
  orange: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', accent: 'text-amber-600' },
  amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', accent: 'text-amber-600' },
  lime: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', accent: 'text-emerald-600' },
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', accent: 'text-emerald-600' },
  pink: { iconBg: 'bg-rose-50', iconText: 'text-rose-600', accent: 'text-rose-600' },
  rose: { iconBg: 'bg-rose-50', iconText: 'text-rose-600', accent: 'text-rose-600' },
  violet: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', accent: 'text-violet-600' },
  purple: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', accent: 'text-violet-600' },
  cyan: { iconBg: 'bg-cyan-50', iconText: 'text-cyan-600', accent: 'text-cyan-600' },
  yellow: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', accent: 'text-amber-600' },
  gray: { iconBg: 'bg-slate-50', iconText: 'text-slate-500', accent: 'text-slate-600' },
};

export function StatCard({ title, value, sub, icon, color = 'electric' }: { title: string; value: ReactNode; sub?: string; icon?: any; color?: string }) {
  const t = STAT_TINTES[color] ?? STAT_TINTES.electric;
  const Icon = typeof icon === 'function' || typeof icon === 'string' ? icon : null;
  const icone = isValidElement(icon) ? icon : Icon ? <Icon className="h-4 w-4" /> : null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold mt-1 leading-none text-slate-900 tabular-nums tracking-tight">
            {typeof value === 'number' ? <CountUp value={value} /> : value}
          </p>
          {sub && <p className="text-[0.68rem] mt-1.5 text-slate-400">{sub}</p>}
        </div>
        {icone && (
          <div className={`flex-shrink-0 h-9 w-9 rounded-lg ${t.iconBg} flex items-center justify-center`}>
            {cloneElement(icone as any, { className: `h-4 w-4 ${t.iconText}` })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── STATUS BADGE — tons doux ──
export function StatusBadge({ statut, label }: { statut: string; label?: string }) {
  const couleurs: Record<string, string> = {
    valide: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    payee: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    actif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    impayee: 'bg-rose-50 text-rose-700 border-rose-200',
    absent: 'bg-rose-50 text-rose-700 border-rose-200',
    refuse: 'bg-rose-50 text-rose-700 border-rose-200',
    annule: 'bg-rose-50 text-rose-700 border-rose-200',
    attente: 'bg-amber-50 text-amber-700 border-amber-200',
    brouillon: 'bg-amber-50 text-amber-700 border-amber-200',
    partiel: 'bg-amber-50 text-amber-700 border-amber-200',
    retard: 'bg-orange-50 text-orange-700 border-orange-200',
    diplome: 'bg-blue-50 text-blue-700 border-blue-200',
    default: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  const s = (statut ?? '').toLowerCase();
  const cle = Object.keys(couleurs).find((k) => s.includes(k)) ?? 'default';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[0.7rem] font-medium ${couleurs[cle]}`}>
      {label ?? statutLabel(statut)}
    </span>
  );
}

// ── DATA TABLE ──
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
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-200 bg-slate-50/50 hover:bg-slate-50/50">
              {columns.map(c => (
                <TableHead key={c.key} className="text-[0.66rem] font-semibold uppercase tracking-wide text-slate-500 py-3 px-3">
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
                    <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400">{emptyLabel}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <motion.tr
                key={r.id ?? i}
                className="border-b border-slate-100 hover:bg-slate-50/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.2 }}
              >
                {columns.map(c => (
                  <TableCell key={c.key} className="text-[0.8rem] text-slate-700 py-2.5 px-3">
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
      {plafonne && onLoadMore && (
        <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50/30">
          <span className="text-xs text-slate-500">{rows.length} affiché(s) sur {total}</span>
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── SECTION BLOCK ──
export function SectionBlock({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="fx-slide-up rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div className="min-w-0">
          <h3 className="text-[0.85rem] font-semibold text-slate-800">{title}</h3>
          {description && <p className="text-[0.7rem] text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ── CREATE BUTTON ──
export function CreateButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-medium h-8 rounded-lg shadow-sm" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

// ── EMPTY STATE ──
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── INFO ROW ──
export function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-xs text-slate-400 font-medium flex-shrink-0">{label}</dt>
      <dd className="text-xs text-slate-700 font-medium text-right">{value ?? '—'}</dd>
    </div>
  );
}

// ── FORM FIELD ──
export function FormField({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── MODAL FORM ──
type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'month' | 'datetime-local' | 'textarea' | 'select' | 'checkbox' | 'hidden' | 'password' | 'email';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  step?: string | number;
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
        setErreur(resultat.error ?? 'Opération refusée.');
        return;
      }
      setOpen(false);
    });
  }

  const champsVisibles = fields.filter((f) => f.type !== 'hidden');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 shadow-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold text-slate-800">{title}</DialogTitle>
        </DialogHeader>
        {erreur && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {erreur}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <input key={f.name} type="hidden" name={f.name} value={f.type === 'hidden' ? valueOf(f) : undefined} />
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {champsVisibles.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <FormField label={f.label} required={f.required}>
                  {f.type === 'textarea' ? (
                    <Textarea name={f.name} defaultValue={valueOf(f)} placeholder={f.placeholder} required={f.required}
                      className="rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  ) : f.type === 'select' ? (
                    <select name={f.name} defaultValue={valueOf(f) ?? ''} required={f.required}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 py-2">
                      <Checkbox name={f.name} defaultChecked={valueOf(f) === 'on' || valueOf(f) === true} />
                      <span className="text-sm text-slate-600">{f.placeholder}</span>
                    </div>
                  ) : (
                    <Input type={f.type ?? 'text'} name={f.name} defaultValue={valueOf(f)} placeholder={f.placeholder} required={f.required}
                      step={f.step}
                      className="rounded-lg border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  )}
                </FormField>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" className="rounded-lg">Annuler</Button>
            </DialogClose>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
