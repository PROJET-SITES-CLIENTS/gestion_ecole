'use client';

// ====================================================================
// INSTITUTIONAL DESIGN SYSTEM — ScolaGestion v5.1
// Angles droits · Palette sobre · Dark mode via variables CSS
// Tous les composants utilisent bg-card/text-foreground/border-border
// pour que le mode sombre fonctionne automatiquement.
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
        className={`animate-pop-in border px-4 py-2.5 text-sm font-medium ${
          message.startsWith('✓')
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
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
    <div className="fx-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-[0.8rem] text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ── STAT CARD — fond card, icône teintée, angles droits ──
const STAT_TINTES: Record<string, { iconBg: string; iconText: string }> = {
  electric: { iconBg: 'bg-blue-500/10 dark:bg-blue-500/20', iconText: 'text-blue-600 dark:text-blue-400' },
  blue: { iconBg: 'bg-blue-500/10 dark:bg-blue-500/20', iconText: 'text-blue-600 dark:text-blue-400' },
  orange: { iconBg: 'bg-amber-500/10 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
  amber: { iconBg: 'bg-amber-500/10 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
  lime: { iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400' },
  emerald: { iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400' },
  pink: { iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-400' },
  rose: { iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-400' },
  violet: { iconBg: 'bg-violet-500/10 dark:bg-violet-500/20', iconText: 'text-violet-600 dark:text-violet-400' },
  purple: { iconBg: 'bg-violet-500/10 dark:bg-violet-500/20', iconText: 'text-violet-600 dark:text-violet-400' },
  cyan: { iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20', iconText: 'text-cyan-600 dark:text-cyan-400' },
  yellow: { iconBg: 'bg-amber-500/10 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
  gray: { iconBg: 'bg-slate-500/10 dark:bg-slate-500/20', iconText: 'text-slate-500 dark:text-slate-400' },
};

export function StatCard({ title, value, sub, icon, color = 'electric' }: { title: string; value: ReactNode; sub?: string; icon?: any; color?: string }) {
  const t = STAT_TINTES[color] ?? STAT_TINTES.electric;
  const Icon = typeof icon === 'function' || typeof icon === 'string' ? icon : null;
  const icone = isValidElement(icon) ? icon : Icon ? <Icon className="h-4 w-4" /> : null;
  return (
    <div className="border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold mt-1 leading-none text-foreground tabular-nums tracking-tight">
            {typeof value === 'number' ? <CountUp value={value} /> : value}
          </p>
          {sub && <p className="text-[0.68rem] mt-1.5 text-muted-foreground/70">{sub}</p>}
        </div>
        {icone && (
          <div className={`flex-shrink-0 h-9 w-9 flex items-center justify-center ${t.iconBg}`}>
            {cloneElement(icone as any, { className: `h-4 w-4 ${t.iconText}` })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── STATUS BADGE — tons doux avec dark mode ──
export function StatusBadge({ statut, label }: { statut: string; label?: string }) {
  const couleurs: Record<string, string> = {
    valide: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    payee: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    actif: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    present: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    impayee: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    absent: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    refuse: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    annule: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    attente: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    brouillon: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    partiel: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    retard: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20',
    diplome: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
    default: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
  };
  const s = (statut ?? '').toLowerCase();
  const cle = Object.keys(couleurs).find((k) => s.includes(k)) ?? 'default';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[0.7rem] font-medium ${couleurs[cle]}`}>
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
    <div className="border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
              {columns.map(c => (
                <TableHead key={c.key} className="text-[0.66rem] font-semibold uppercase tracking-wide text-muted-foreground py-3 px-3">
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
                    <div className="h-10 w-10 bg-muted flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <motion.tr
                key={r.id ?? i}
                className="border-b border-border/50 hover:bg-muted/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.015, 0.3), duration: 0.2 }}
              >
                {columns.map(c => (
                  <TableCell key={c.key} className="text-[0.8rem] text-foreground py-2.5 px-3">
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
      {plafonne && onLoadMore && (
        <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-muted/30">
          <span className="text-xs text-muted-foreground">{rows.length} affiché(s) sur {total}</span>
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── SECTION BLOCK — marge externe mb-4 pour éviter l'accolement ──
export function SectionBlock({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="fx-slide-up border border-border bg-card shadow-sm overflow-hidden mb-4">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50">
        <div className="min-w-0">
          <h3 className="text-[0.85rem] font-semibold text-foreground">{title}</h3>
          {description && <p className="text-[0.7rem] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
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
    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-medium h-8" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" /> {label}
    </Button>
  );
}

// ── EMPTY STATE ──
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border bg-muted/30">
      <div className="h-10 w-10 bg-muted flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── INFO ROW ──
export function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-xs text-muted-foreground font-medium flex-shrink-0">{label}</dt>
      <dd className="text-xs text-foreground font-medium text-right">{value ?? '—'}</dd>
    </div>
  );
}

// ── FORM FIELD ──
export function FormField({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border border-border shadow-lg bg-popover">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
        </DialogHeader>
        {erreur && (
          <div className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
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
                      className="border-input bg-card text-sm focus:ring-2 focus:ring-ring/20 focus:border-ring" />
                  ) : f.type === 'select' ? (
                    <select name={f.name} defaultValue={valueOf(f) ?? ''} required={f.required}
                      className="w-full h-9 border border-input bg-card px-3 text-sm text-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring">
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 py-2">
                      <Checkbox name={f.name} defaultChecked={valueOf(f) === 'on' || valueOf(f) === true} />
                      <span className="text-sm text-muted-foreground">{f.placeholder}</span>
                    </div>
                  ) : (
                    <Input type={f.type ?? 'text'} name={f.name} defaultValue={valueOf(f)} placeholder={f.placeholder} required={f.required}
                      step={f.step}
                      className="border-input bg-card text-sm text-foreground focus:ring-2 focus:ring-ring/20 focus:border-ring" />
                  )}
                </FormField>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Annuler</Button>
            </DialogClose>
            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
