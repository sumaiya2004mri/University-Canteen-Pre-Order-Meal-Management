import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChefHat,
  ClipboardList,
  Clock,
  Package,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, EmptyState, SectionTitle, StatusBadge, orderTotal } from '@/components/ui';
import { formatBDT, type MenuItem, type Order, type PickupSlot } from '@/lib/supabase';

export type AdminOrder = Order & { items: { id: string; name: string; quantity: number }[] };

type Props = {
  orders: AdminOrder[];
  menuItems: MenuItem[];
  slots: PickupSlot[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  slotLabel: (slotId: string | null) => string;
};

export default function AdminDashboard({ orders, menuItems, slots, loading, error, onRetry, slotLabel }: Props) {
  const now = new Date();

  const stats = useMemo(() => {
    const count = (s: string) => orders.filter((o) => o.order_status === s).length;
    const revenue = orders
      .filter((o) => o.order_status !== 'Cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
    return [
      { icon: ClipboardList, label: 'Total Orders', value: String(orders.length), bg: 'bg-brand-beige text-brand-primary' },
      { icon: Clock, label: 'Pending Orders', value: String(count('Pending')), bg: 'bg-amber-50 text-amber-700' },
      { icon: ChefHat, label: 'Preparing', value: String(count('Preparing')), bg: 'bg-blue-50 text-blue-700' },
      { icon: CheckCircle, label: 'Completed', value: String(count('Completed')), bg: 'bg-emerald-50 text-emerald-700' },
      { icon: Wallet, label: 'Total Revenue', value: formatBDT(revenue), bg: 'bg-brand-beige text-brand-gold' },
      { icon: Package, label: 'Menu Items', value: String(menuItems.length), bg: 'bg-brand-beige text-brand-secondary' },
    ];
  }, [orders, menuItems]);

  const daily = useMemo(() => {
    const today = now.toDateString();
    return orders.filter((o) => new Date(o.created_at).toDateString() === today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const weekly = useMemo(() => {
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.created_at).getTime() >= weekAgo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const monthlyRevenue = useMemo(() => {
    const month = now.getMonth();
    const year = now.getFullYear();
    return orders
      .filter((o) => {
        const d = new Date(o.created_at);
        return d.getMonth() === month && d.getFullYear() === year && o.order_status !== 'Cancelled';
      })
      .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) map.set(o.order_status, (map.get(o.order_status) ?? 0) + 1);
    return Array.from(map.entries());
  }, [orders]);

  const bestSellers = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.items) map.set(it.name, (map.get(it.name) ?? 0) + it.quantity);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  const lowStock = useMemo(
    () => menuItems.filter((m) => (m as MenuItem & { stock_quantity?: number }).stock_quantity !== undefined &&
      (m as MenuItem & { stock_quantity?: number }).stock_quantity! <= 5),
    [menuItems],
  );

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="space-y-8">
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={onRetry} className="focus-ring rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
            Retry
          </button>
        </div>
      )}

      <section aria-label="Canteen statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${s.bg}`}>
                <Icon className="h-5 w-5" />
              </div>
              {loading ? (
                <div className="h-7 w-12 animate-pulse rounded bg-brand-beige" />
              ) : (
                <p className="text-xl font-extrabold text-brand-black sm:text-2xl">{s.value}</p>
              )}
              <p className="mt-0.5 truncate text-xs font-semibold text-brand-gray">{s.label}</p>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionTitle>Analytics Snapshot</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-brand-ivory p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-gray">
                <TrendingUp className="h-3.5 w-3.5 text-brand-gold" /> Today
              </p>
              <p className="mt-1 text-xl font-extrabold text-brand-black">{daily.length} orders</p>
            </div>
            <div className="rounded-xl bg-brand-ivory p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-gray">
                <TrendingUp className="h-3.5 w-3.5 text-brand-gold" /> Last 7 days
              </p>
              <p className="mt-1 text-xl font-extrabold text-brand-black">{weekly.length} orders</p>
            </div>
            <div className="rounded-xl bg-brand-ivory p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-gray">
                <Wallet className="h-3.5 w-3.5 text-brand-gold" /> This month
              </p>
              <p className="mt-1 text-xl font-extrabold text-brand-black">{formatBDT(monthlyRevenue)}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-gray/80">Status distribution</p>
            {statusDistribution.length === 0 ? (
              <p className="text-sm text-brand-gray/70">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {statusDistribution.map(([status, n]) => {
                  const pct = orders.length ? Math.round((n / orders.length) * 100) : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-xs font-medium text-brand-gray">{status}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-beige">
                        <div className="h-full rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-brand-black">{n}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-gray/80">Best sellers</p>
            {bestSellers.length === 0 ? (
              <p className="text-sm text-brand-gray/70">No sales data yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {bestSellers.map(([name, qty], i) => (
                  <li key={name} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-beige text-xs font-bold text-brand-primary">{i + 1}</span>
                    <span className="flex-1 truncate text-brand-black">{name}</span>
                    <span className="font-semibold text-brand-gray">{qty} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle>Low Stock Warnings</SectionTitle>
            {lowStock.length === 0 ? (
              <p className="text-sm text-brand-gray/70">All items have healthy stock levels, or stock tracking is not enabled for any item.</p>
            ) : (
              <ul className="space-y-2">
                {lowStock.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm">
                    <span className="truncate text-brand-black">{m.name}</span>
                    <span className="shrink-0 font-bold text-amber-700">
                      {(m as MenuItem & { stock_quantity?: number }).stock_quantity} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle>Pickup Slots Today</SectionTitle>
            {slots.length === 0 ? (
              <p className="text-sm text-brand-gray/70">No pickup slots configured.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {slots.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-brand-ivory px-3 py-2">
                    <span className="font-medium text-brand-black">
                      {new Date(s.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-xs font-semibold ${s.is_active ? 'text-emerald-700' : 'text-red-600'}`}>
                      {s.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <section>
        <SectionTitle>Recent Orders</SectionTitle>
        <Card>
          {loading ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No orders yet" hint="Student pre-orders will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-gray/80">
                    <th scope="col" className="px-4 py-3 font-semibold">Order ID</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Items</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Placed</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pickup</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Total</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-dark">#{o.id.slice(0, 8)}</td>
                      <td className="max-w-56 truncate px-4 py-3 text-brand-gray">
                        {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-brand-gray">
                        {new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-brand-gray">{slotLabel(o.pickup_slot_id)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-black">{orderTotal(o)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.order_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
