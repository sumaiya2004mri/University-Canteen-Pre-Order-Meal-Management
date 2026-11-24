import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, EmptyState, SearchInput, SectionTitle } from '@/components/ui';
import { formatBDT, type MenuItem, type PickupSlot } from '@/lib/supabase';

export type AdminMenuItem = MenuItem & { stock_quantity?: number | null; updated_at?: string | null };

const LOW_STOCK_THRESHOLD = 5;

export function stockStatus(item: AdminMenuItem): 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Not Tracked' {
  if (item.stock_quantity == null) return 'Not Tracked';
  if (item.stock_quantity <= 0) return 'Out of Stock';
  if (item.stock_quantity <= LOW_STOCK_THRESHOLD) return 'Low Stock';
  return 'In Stock';
}

const STATUS_BADGE: Record<string, string> = {
  'In Stock': 'bg-emerald-50 text-emerald-700',
  'Low Stock': 'bg-amber-50 text-amber-700',
  'Out of Stock': 'bg-red-50 text-red-600',
  'Not Tracked': 'bg-slate-100 text-slate-500',
};

export function AdminStock({
  items,
  loading,
  onUpdateStock,
}: {
  items: AdminMenuItem[];
  loading: boolean;
  onUpdateStock: (item: AdminMenuItem, newStock: number) => Promise<{ ok: boolean; message: string }>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = items
    .filter((i) => {
      if (statusFilter === 'all') return true;
      return stockStatus(i) === statusFilter;
    })
    .filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  const lowStockItems = items.filter((i) => ['Low Stock', 'Out of Stock'].includes(stockStatus(i)));

  async function apply(item: AdminMenuItem, newStock: number) {
    if (newStock < 0) {
      setFeedback({ ok: false, message: 'Stock cannot be negative.' });
      return;
    }
    setBusyId(item.id);
    const result = await onUpdateStock(item, newStock);
    setFeedback(result);
    setBusyId(null);
  }

  const inputClass =
    'w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30';

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          {feedback.message}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {lowStockItems.length} item{lowStockItems.length !== 1 ? 's are' : ' is'} running low or out of stock:{' '}
            {lowStockItems.slice(0, 4).map((i) => i.name).join(', ')}
            {lowStockItems.length > 4 ? '…' : ''}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by stock status" className={`${inputClass} sm:w-48`}>
          <option value="all">All stock statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Not Tracked">Not Tracked</option>
        </select>
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search food items..." ariaLabel="Search stock items" />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No items match" hint="Try a different search or status filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-gray/80">
                  <th scope="col" className="px-4 py-3 font-semibold">Food Item</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Current Stock</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Available</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last Updated</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const status = stockStatus(item);
                  const draft = drafts[item.id];
                  return (
                    <tr key={item.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/60">
                      <td className="px-4 py-3 font-medium text-brand-black">{item.name}</td>
                      <td className="px-4 py-3 font-bold text-brand-dark">{item.stock_quantity ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}>{status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${item.is_available ? 'text-emerald-700' : 'text-red-600'}`}>
                          {item.is_available ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-gray/80">
                        {item.updated_at ? new Date(item.updated_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => apply(item, (item.stock_quantity ?? 0) - 1)}
                            disabled={busyId === item.id || item.stock_quantity == null || item.stock_quantity <= 0}
                            aria-label={`Decrease stock of ${item.name}`}
                            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-gray hover:border-brand-primary hover:text-brand-primary disabled:opacity-40"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            aria-label={`Set stock for ${item.name}`}
                            value={draft ?? ''}
                            placeholder={String(item.stock_quantity ?? '—')}
                            onChange={(e) => setDrafts({ ...drafts, [item.id]: Number(e.target.value) })}
                            className="focus-ring w-20 rounded-lg border border-brand-border px-2 py-1.5 text-center text-sm"
                          />
                          <button
                            onClick={() => apply(item, (item.stock_quantity ?? 0) + 1)}
                            disabled={busyId === item.id || item.stock_quantity == null}
                            aria-label={`Increase stock of ${item.name}`}
                            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-gray hover:border-brand-primary hover:text-brand-primary disabled:opacity-40"
                          >
                            +
                          </button>
                          <button
                            onClick={() => apply(item, draft ?? item.stock_quantity ?? 0)}
                            disabled={busyId === item.id || draft == null || draft < 0}
                            className="focus-ring rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
                          >
                            {busyId === item.id ? '...' : 'Set'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminSlots({
  slots,
  loading,
  onCreate,
  onToggle,
}: {
  slots: (PickupSlot & { capacity?: number | null; reserved?: number | null })[];
  loading: boolean;
  onCreate: (slotTime: string) => Promise<{ ok: boolean; message: string }>;
  onToggle: (slot: PickupSlot) => Promise<{ ok: boolean; message: string }>;
}) {
  const [newTime, setNewTime] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTime) return;
    setBusy(true);
    const result = await onCreate(newTime);
    setFeedback(result);
    if (result.ok) setNewTime('');
    setBusy(false);
  }

  async function handleToggle(slot: PickupSlot) {
    setBusy(true);
    const result = await onToggle(slot);
    setFeedback(result);
    setBusy(false);
  }

  const inputClass =
    'rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30';

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Card className="p-5">
        <SectionTitle>Add Pickup Slot</SectionTitle>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="slot-dt" className="block text-xs font-semibold text-brand-dark">Date & time</label>
            <input id="slot-dt" type="datetime-local" required value={newTime} onChange={(e) => setNewTime(e.target.value)} className={`${inputClass} mt-1`} />
          </div>
          <button type="submit" disabled={busy} className="focus-ring rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {busy ? 'Creating...' : 'Create Slot'}
          </button>
        </form>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No pickup slots" hint="Create a slot so students can choose pickup times." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-gray/80">
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Time</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reservations</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => {
                  const reserved = s.reserved ?? null;
                  return (
                    <tr key={s.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/60">
                      <td className="px-4 py-3 text-brand-gray">
                        {new Date(s.slot_time).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-black">
                        {new Date(s.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-brand-gray">
                        {reserved != null ? `${reserved} order${reserved !== 1 ? 's' : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {s.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggle(s)}
                          disabled={busy}
                          className="focus-ring rounded-lg border border-brand-border px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-beige disabled:opacity-50"
                        >
                          {s.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminReports({
  orders,
  menuItems,
  loading,
}: {
  orders: AdminOrderLike[];
  menuItems: AdminMenuItem[];
  loading: boolean;
}) {
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'all'>('all');

  const cutoff = (() => {
    const now = Date.now();
    if (range === 'day') return now - 24 * 60 * 60 * 1000;
    if (range === 'week') return now - 7 * 24 * 60 * 60 * 1000;
    if (range === 'month') return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
  })();

  const inRange = orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  const completed = inRange.filter((o) => o.order_status === 'Completed');
  const cancelled = inRange.filter((o) => o.order_status === 'Cancelled');
  const revenue = completed.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  const categoryPerformance = (() => {
    const catMap = new Map<string, number>();
    for (const o of inRange) {
      for (const it of o.items) {
        const item = menuItems.find((m) => m.name === it.name);
        const cat = item?.category ?? 'Uncategorized';
        catMap.set(cat, (catMap.get(cat) ?? 0) + it.quantity);
      }
    }
    return Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(['day', 'week', 'month', 'all'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`focus-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              range === r
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-border bg-white text-brand-gray hover:border-brand-gold hover:text-brand-dark'
            }`}
          >
            {r === 'day' ? 'Today' : r === 'week' ? 'Last 7 days' : r === 'month' ? 'Last 30 days' : 'All time'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-brand-beige/70" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { label: 'Orders in range', value: String(inRange.length) },
              { label: 'Completed orders', value: String(completed.length) },
              { label: 'Cancelled orders', value: String(cancelled.length) },
              { label: 'Revenue (completed)', value: formatBDT(revenue) },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-xl font-extrabold text-brand-black sm:text-2xl">{s.value}</p>
                <p className="mt-0.5 text-xs font-semibold text-brand-gray">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <SectionTitle>Category Performance (units sold)</SectionTitle>
              {categoryPerformance.length === 0 ? (
                <p className="text-sm text-brand-gray/70">No sales in this range.</p>
              ) : (
                <div className="space-y-2">
                  {categoryPerformance.map(([cat, qty]) => {
                    const max = categoryPerformance[0][1];
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-xs font-medium text-brand-gray">{cat}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-beige">
                          <div className="h-full rounded-full bg-brand-gold" style={{ width: `${(qty / max) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-bold text-brand-black">{qty}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <SectionTitle>Inventory Status</SectionTitle>
              <ul className="space-y-1.5 text-sm">
                {menuItems.slice(0, 8).map((m) => {
                  const st = stockStatus(m);
                  return (
                    <li key={m.id} className="flex items-center justify-between rounded-xl bg-brand-ivory px-3 py-2">
                      <span className="truncate text-brand-black">{m.name}</span>
                      <span className={`shrink-0 text-xs font-semibold ${st === 'Out of Stock' ? 'text-red-600' : st === 'Low Stock' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {m.stock_quantity != null ? `${m.stock_quantity} in stock` : 'not tracked'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

type AdminOrderLike = {
  id: string;
  created_at: string;
  order_status: string;
  total_amount: number | null;
  items: { name: string; quantity: number }[];
};
