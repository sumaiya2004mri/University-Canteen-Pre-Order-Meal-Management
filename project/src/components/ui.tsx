import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { formatBDT, type MenuItem, type Order, type OrderStatus } from '@/lib/supabase';

export const STATUS_STYLES: Record<OrderStatus, string> = {
  'Pending': 'bg-amber-50 text-amber-800 border-amber-200',
  'Preparing': 'bg-blue-50 text-blue-800 border-blue-200',
  'Ready for Pickup': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Completed': 'bg-slate-100 text-slate-600 border-slate-200',
  'Cancelled': 'bg-red-50 text-red-700 border-red-200',
};

export const STATUS_DOT: Record<OrderStatus, string> = {
  'Pending': 'bg-amber-500',
  'Preparing': 'bg-blue-500',
  'Ready for Pickup': 'bg-emerald-500',
  'Completed': 'bg-slate-400',
  'Cancelled': 'bg-red-500',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        STATUS_STYLES[status] ?? STATUS_STYLES['Pending']
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? STATUS_DOT['Pending']}`} />
      {status}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-brand-border bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-brand-black">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border bg-white/60 py-12 text-center">
      <p className="font-medium text-brand-gray">{title}</p>
      {hint && <p className="mt-1 text-sm text-brand-gray/70">{hint}</p>}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  onClear,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onClear: () => void;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray/60" />
      <input
        type="search"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-9 text-sm text-brand-black placeholder:text-brand-gray/60 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
      />
      {value && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          className="focus-ring absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-brand-gray/70 hover:bg-brand-beige"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function useSearch<T>(items: T[], term: string, fields: (item: T) => (string | null | undefined)[]): T[] {
  return useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => fields(item).some((f) => (f ?? '').toLowerCase().includes(q)));
  }, [items, term, fields]);
}

export function Avatar({ name, className = 'h-9 w-9 text-sm' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-primary font-semibold text-white ${className}`}
    >
      {initials}
    </div>
  );
}

export function StudentInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-brand-ivory px-3 py-2.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-brand-gray/80">{label}</span>
      <span className="truncate text-sm font-semibold text-brand-black">{value}</span>
    </div>
  );
}

export function orderTotal(order: Order): string {
  return formatBDT(order.total_amount);
}

export function useCategoryFilter<T extends MenuItem>(items: T[], category: string): T[] {
  return useMemo(
    () => (category === 'All' ? items : items.filter((i) => i.category === category)),
    [items, category],
  );
}
