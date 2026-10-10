'use client';

// ====================================================================
// NEO-BRUTALIST DESIGN SYSTEM — ScolaGestion v3
// Angles droits · Couleurs vives · Ombres sticker · Typographie forte
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
        className={`animate-pop-in border-2 px-4 py-2.5 text-sm font-semibold ${
          message.startsWith('✓')
            ? 'border-[#0A0A0A] bg-[#84CC16] text-[#0A0A0A] shadow-[3px_3px_0px_#0A0A0A]'
            : 'border-[#0A0A0A] bg-[#EC4899] text-white shadow-[3px_3px_0px_#0A0A0A]'
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
    <div className="animate-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b-2 border-[#0A0A0A] pb-4">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] font-extrabold tracking-tight text-[#0A0A0A] leading-tight" style={{ fontFamily: 'var(--font-heading), Archivo, sans-serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-[0.8rem] text-neutral-500 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ── STAT CARD — couleur vive pleine ──
export function StatCard({ title, value, sub, icon, color = 'electric' }: { title: string; value: ReactNode; sub?: string; icon?: any; color?: string }) {
  const palettes: Record<string, { bg: string; text: string; border: string }> = {
    electric: { bg: '#2563EB', text: '#FFFFFF', border: '#0A0A0A' },
    orange: { bg: '#F97316', text: '#FFFFFF', border: '#0A0A0A' },
    lime: { bg: '#84CC16', text: '#0A0A0A', border: '#0A0A0A' },
    pink: { bg: '#EC4899', text: '#FFFFFF', border: '#0A0A0A' },
    violet: { bg: '#8B5CF6', text: '#FFFFFF', border: '#0A0A0A' },
    cyan: { bg: '#06B6D4', text: '#0A0A0A', border: '#0A0A0A' },
    yellow: { bg: '#FACC15', text: '#0A0A0A', border: '#0A0A0A' },
    emerald: { bg: '#10B981', text: '#FFFFFF', border: '#0A0A0A' },
    blue: { bg: '#3B82F6', text: '#FFFFFF', border: '#0A0A0A' },
    amber: { bg: '#F59E0B', text: '#0A0A0A', border: '#0A0A0A' },
    purple: { bg: '#A855F7', text: '#FFFFFF', border: '#0A0A0A' },
    gray: { bg: '#F5F5F5', text: '#0A0A0A', border: '#0A0A0A' },
  };
  const p = palettes[color] ?? palettes.electric;
  const Icon = typeof icon === 'function' || typeof icon === 'string' ? icon : null;
  const icone = isValidElement(icon) ? icon : Icon ? <Icon className="h-[1.1rem] w-[1.1rem]" /> : null;
  return (
    <div
      className="border-2 shadow-[4px_4px_0px_#0A0A0A] p-4 transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0A0A0A]"
      style={{ background: p.bg, color: p.text, borderColor: p.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] opacity-80">{title}</p>
          <p className="text-[1.65rem] font-bold mt-1 leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}>
            {value}
          </p>
          {sub && <p className="text-[0.68rem] mt-1.5 font-medium opacity-70">{sub}</p>}
        </div>
        {icone && (
          <div className="flex-shrink-0 h-10 w-10 border-2 flex items-center justify-center" style={{ borderColor: p.border, background: 'rgba(255,255,255,0.2)' }}>
            {cloneElement(icone as any, { className: 'h-[1.1rem] w-[1.1rem]' })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── STATUS BADGE ──
export function StatusBadge({ statut, label }: { statut: string; label?: string }) {
  return (
    <span className="brutal-badge" style={{ background: getStatutBg(statut), color: getStatutText(statut) }}>
      {label ?? statutLabel(statut)}
    </span>
  );
}

function getStatutBg(statut: string): string {
  const s = statut?.toLowerCase() ?? '';
  if (/valide|paye|publie|actif|recue|present|execute|admis|termine/.test(s)) return '#84CC16';
  if (/impayee|absent|rejete|refuse|annule|exclu|supprime/.test(s)) return '#EC4899';
  if (/attente|brouillon|partiel|soumis|planifie|en_cours|demande/.test(s)) return '#FACC15';
  if (/diplome|retard/.test(s)) return '#F97316';
  return '#E5E5E5';
}

function getStatutText(statut: string): string {
  const s = statut?.toLowerCase() ?? '';
  if (/valide|paye|publie|actif|recue|present|execute|admis|termine/.test(s)) return '#0A0A0A';
  return s === 'impayee' || s === 'absent' || s === 'rejete' || s === 'refuse' || s === 'annule' ? '#FFFFFF' : '#0A0A0A';
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
    <div className="border-2 border-[#0A0A0A] bg-white overflow-hidden shadow-[4px_4px_0px_#0A0A0A]">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 max-h-[60vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-[#0A0A0A] [&>th]:bg-[#0A0A0A] [&>th]:text-white">
              {columns.map(c => (
                <TableHead key={c.key} className="text-[0.63rem] font-bold uppercase tracking-[0.06em] py-3 px-3">
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
                    <div className="h-12 w-12 border-2 border-[#0A0A0A] bg-[#FACC15] flex items-center justify-center shadow-[3px_3px_0px_#0A0A0A]">
                      <Inbox className="h-5 w-5 text-[#0A0A0A]" />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">{emptyLabel}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.map((r, i) => (
              <TableRow key={r.id ?? i} className="border-b border-neutral-200 [&>td]:py-2.5 [&>td]:px-3 hover:bg-[#CFFAFE]">
                {columns.map(c => (
                  <TableCell key={c.key} className="text-[0.8rem] text-[#0A0A0A]">
                    {c.render ? c.render(r) : (r as any)[c.key] ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {(plafonne || typeof total === 'number') && (
        <div className="flex items-center justify-between border-t-2 border-[#0A0A0A] bg-[#FACC15] px-4 py-2 text-xs font-bold text-[#0A0A0A]">
          <span className="tabular-nums">
            {rows.length} affiché(s){typeof total === 'number' ? ` sur ${total}` : ''}
          </span>
          {plafonne && onLoadMore && (
            <Button size="sm" className="brutal-btn h-7 bg-white text-[#0A0A0A] text-xs" onClick={onLoadMore} disabled={loadingMore}>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              {loadingMore ? 'Chargement…' : 'Charger plus'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── FORM FIELD ──
export function FormField({ label, children, required, hidden }: { label: string; children: ReactNode; required?: boolean; hidden?: boolean }) {
  if (hidden) return <>{children}</>;
  return (
    <div className="space-y-1">
      <Label className="text-[0.7rem] font-bold text-[#0A0A0A] uppercase tracking-wide">{label} {required && <span className="text-[#EC4899]">*</span>}</Label>
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

// ── MODAL FORM ──
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
      <DialogContent className="!rounded-none border-2 border-[#0A0A0A] shadow-[6px_6px_0px_#0A0A0A] max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-0 border-b-2 border-[#0A0A0A] mb-3">
          <DialogTitle className="text-base font-extrabold text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading), Archivo, sans-serif' }}>
            {title}
          </DialogTitle>
        </DialogHeader>
        {erreur && (
          <div className="animate-pop-in border-2 border-[#0A0A0A] bg-[#EC4899] px-3.5 py-2.5 text-sm font-semibold text-white" role="alert">
            {erreur}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {fields.map(f => (
            <FormField key={f.name} label={f.label} required={f.required} hidden={f.type === 'hidden'}>
              {f.type === 'textarea' ? (
                <Textarea name={f.name} placeholder={f.placeholder} defaultValue={valueOf(f)} required={f.required} className="brutal-input text-sm min-h-[72px]" />
              ) : f.type === 'select' ? (
                <select
                  name={f.name}
                  defaultValue={valueOf(f) ?? ''}
                  required={f.required}
                  className="brutal-input w-full h-10 px-3 py-1 text-sm font-medium"
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
                  className="brutal-input text-sm h-10 font-medium"
                />
              )}
            </FormField>
          ))}
          <DialogFooter className="pt-2 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="brutal-btn bg-white text-[#0A0A0A] h-9" disabled={pending}>Annuler</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
              className="brutal-btn bg-[#2563EB] text-white h-9 font-bold"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white animate-spin" />
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

// ── SECTION BLOCK ──
export function SectionBlock({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-2 border-[#0A0A0A] bg-white mb-5 shadow-[4px_4px_0px_#0A0A0A]">
      <div className="flex flex-row items-center justify-between gap-3 px-4 pt-3 pb-2.5 border-b-2 border-[#0A0A0A] bg-[#0A0A0A]">
        <div className="min-w-0">
          <h3 className="text-[0.88rem] font-extrabold tracking-tight text-white" style={{ fontFamily: 'var(--font-heading), Archivo, sans-serif' }}>
            {title}
          </h3>
          {description && <p className="text-[0.68rem] text-neutral-400 mt-0.5 leading-relaxed">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── EMPTY STATE ──
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="animate-pop-in text-center py-14 px-6 border-2 border-dashed border-[#0A0A0A] bg-[#FAFAFA]">
      <div className="mx-auto h-14 w-14 border-2 border-[#0A0A0A] bg-[#FACC15] flex items-center justify-center shadow-[3px_3px_0px_#0A0A0A] mb-4">
        <Inbox className="h-6 w-6 text-[#0A0A0A]" />
      </div>
      <h3 className="text-sm font-bold text-[#0A0A0A]">{title}</h3>
      {description && <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── INFO ROW ──
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-neutral-200 last:border-0">
      <dt className="text-[0.72rem] text-neutral-500 font-bold uppercase tracking-wide">{label}</dt>
      <dd className="text-[0.82rem] font-bold text-[#0A0A0A] text-right">{value ?? '—'}</dd>
    </div>
  );
}

// ── CREATE BUTTON ──
export const CreateButton = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <Button
    size="sm"
    className="brutal-btn bg-[#F97316] text-white gap-1.5 font-bold h-8"
    onClick={onClick}
  >
    <Plus className="h-3.5 w-3.5" /> {label}
  </Button>
);

export { Plus, X, Eye, Pencil };
