import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Clock, RefreshCw, User } from 'lucide-react';
import { supabase, type OrderStatus, type PickupSlot, formatBDT, mapOrder, mapSlot, ORDER_SELECT, SLOT_SELECT } from '@/lib/supabase';
import { Card, SearchInput } from '@/components/ui';

const STATUS_OPTIONS: OrderStatus[] = ['Pending', 'Preparing', 'Ready for Pickup', 'Completed'];

const STATUS_STYLES: Record<OrderStatus, string> = {
  'Pending': 'bg-amber-50 text-amber-800 border-amber-200',
  'Preparing': 'bg-blue-50 text-blue-800 border-blue-200',
  'Ready for Pickup': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Completed': 'bg-slate-100 text-slate-600 border-slate-200',
  'Cancelled': 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_DOT: Record<OrderStatus, string> = {
  'Pending': 'bg-amber-500',
  'Preparing': 'bg-blue-500',
  'Ready for Pickup': 'bg-emerald-500',
  'Completed': 'bg-slate-400',
  'Cancelled': 'bg-red-500',
};

type StaffOrderItem = {
  id: string;
  menu_item_name: string;
  quantity: number;
  price: number | null;
};

type StaffOrder = {
  id: string;
  pickup_slot_id: string | null;
  order_status: OrderStatus;
  total_amount: number | null;
  created_at: string;
  customer_name: string;
  items: StaffOrderItem[];
};

type Props = {
  slots: PickupSlot[];
};

export default function StaffView({ slots }: Props) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, itemsRes, usersRes] = await Promise.all([
        supabase
          .from('orders')
          .select(ORDER_SELECT)
          .order('order_date', { ascending: false }),
        supabase
          .from('order_items')
          .select('order_item_id, order_id, item_id, quantity, unit_price, menu_items(item_name)'),
        supabase.from('users').select('id, full_name, name, user_id'),
      ]);

      if (ordersRes.error) throw ordersRes.error;

      // Build user name map
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userNames = new Map<string, string>((usersRes.data ?? []).map((u: any) => [
        String(u.id ?? u.user_id ?? ''),
        (u.full_name ?? u.name ?? 'Customer') as string,
      ]));

      // Map orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawOrders = (ordersRes.data ?? []).map((r: any) => mapOrder(r));

      // Map items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allItems: StaffOrderItem[] = (itemsRes.data ?? []).map((it: any) => ({
        id: String(it.order_item_id ?? it.id),
        menu_item_name: it.menu_items?.item_name ?? it.menu_items?.name ?? 'Unknown item',
        quantity: it.quantity ?? 0,
        price: it.unit_price ?? it.price ?? null,
        order_id: String(it.order_id),
      }));

      setOrders(
        rawOrders.map((o) => ({
          ...o,
          customer_name: o.user_id ? (userNames.get(o.user_id) ?? 'Customer') : 'Guest',
          items: allItems.filter((it) => (it as StaffOrderItem & { order_id?: string }).order_id === o.id),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingIds((prev) => new Set(prev).add(orderId));
    // Try new schema column, then old
    let { error: err } = await supabase
      .from('orders')
      .update({ order_status: status })
      .eq('order_id', Number(orderId));
    if (err) {
      ({ error: err } = await supabase
        .from('orders')
        .update({ order_status: status })
        .eq('id', orderId));
    }
    if (err) {
      setError(`Failed to update status: ${err.message}`);
    } else {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o)));
    }
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => (slotFilter === 'all' ? true : o.pickup_slot_id === slotFilter))
        .filter((o) => (statusFilter === 'all' ? true : o.order_status === statusFilter))
        .filter((o) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            o.customer_name.toLowerCase().includes(q) ||
            o.items.some((it) => it.menu_item_name.toLowerCase().includes(q)) ||
            o.id.slice(-8).toLowerCase().includes(q)
          );
        }),
    [orders, slotFilter, statusFilter, search],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of STATUS_OPTIONS) c[s] = orders.filter((o) => o.order_status === s).length;
    return c;
  }, [orders]);

  function slotLabel(slotId: string | null) {
    if (!slotId) return 'No slot';
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return 'No slot';
    try {
      return new Date(slot.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return slot.slot_time;
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-black">Canteen Staff Console</h1>
          <p className="mt-1 text-sm text-brand-gray">Manage incoming pre-orders and update their status.</p>
        </div>
        <button
          onClick={load}
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`focus-ring whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-border bg-white text-brand-gray hover:border-brand-gold hover:text-brand-dark'
            }`}
          >
            All ({counts.all})
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`focus-ring whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-brand-border bg-white text-brand-gray hover:border-brand-gold hover:text-brand-dark'
              }`}
            >
              {s} ({counts[s] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            aria-label="Filter by pickup slot"
            className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          >
            <option value="all">All pickup slots</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {slotLabel(s.id)}
              </option>
            ))}
          </select>
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search by customer or item..."
              ariaLabel="Search orders"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        {loading && orders.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-brand-beige/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-border bg-white/60 py-14 text-center">
            <ChefHat className="mx-auto h-10 w-10 text-brand-secondary/50" />
            <p className="mt-3 font-medium text-brand-gray">No orders match these filters</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((o) => (
              <Card key={o.id} className="p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-black flex items-center gap-1.5">
                      <User className="h-4 w-4 text-brand-gray/60" />
                      {o.customer_name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-brand-gray/70">#{o.id.slice(-8)}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                      STATUS_STYLES[o.order_status] ?? STATUS_STYLES['Pending']
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[o.order_status] ?? STATUS_DOT['Pending']}`} />
                    {o.order_status}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-brand-gray">
                  <Clock className="h-4 w-4 text-brand-gold" />
                  <span className="font-semibold text-brand-dark">{slotLabel(o.pickup_slot_id)}</span>
                  <span className="text-brand-border">|</span>
                  <span>{new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                </div>

                <ul className="mt-3 space-y-1 border-t border-brand-border/60 pt-3">
                  {o.items.map((it, idx) => (
                    <li key={`${it.id}-${idx}`} className="flex justify-between text-sm">
                      <span className="text-brand-gray">
                        <span className="font-semibold text-brand-black">{it.quantity}×</span> {it.menu_item_name}
                      </span>
                      {it.price != null && (
                        <span className="text-brand-gray">{formatBDT(it.price * it.quantity)}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {o.total_amount != null && (
                  <p className="mt-3 border-t border-brand-border/60 pt-3 text-right text-sm font-bold text-brand-black">
                    Total: {formatBDT(o.total_amount)}
                  </p>
                )}

                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-brand-gray">Update status</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        disabled={o.order_status === s || updatingIds.has(o.id)}
                        onClick={() => updateStatus(o.id, s)}
                        className={`focus-ring rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-default ${
                          o.order_status === s
                            ? `${STATUS_STYLES[s]} ring-2 ring-brand-gold/50`
                            : 'border-brand-border bg-white text-brand-gray hover:border-brand-primary hover:text-brand-primary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
