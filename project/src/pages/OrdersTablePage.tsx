import { useMemo, useState } from 'react';
import { XCircle } from 'lucide-react';
import { Card, EmptyState, SearchInput, SectionTitle, StatusBadge, orderTotal } from '@/components/ui';
import type { Order, OrderStatus } from '@/lib/supabase';
import type { Page } from '@/types';

export type OrderWithItems = Order & { items: { id?: string; name: string; quantity: number }[] };

type Props = {
  orders: OrderWithItems[];
  loading: boolean;
  slotLabel: (slotId: string | null) => string;
  onNavigate: (page: Page) => void;
  onCancelOrder?: (orderId: string) => Promise<{ ok: boolean; message: string }>;
  showSearch?: boolean;
  search?: string;
  onSearch?: (v: string) => void;
};

const FILTERS: ('All' | OrderStatus)[] = ['All', 'Pending', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];

/** An order can be cancelled if placed within last 15 min and status is Pending or Preparing */
function canCancel(o: OrderWithItems): boolean {
  if (!['Pending', 'Preparing'].includes(o.order_status)) return false;
  const placed = new Date(o.created_at).getTime();
  return Date.now() - placed <= 15 * 60 * 1000;
}

export default function OrdersTablePage({
  orders,
  loading,
  slotLabel,
  onNavigate,
  onCancelOrder,
  showSearch = false,
  search = '',
  onSearch,
}: Props) {
  const [filter, setFilter] = useState<string>('All');
  const [cancelFeedback, setCancelFeedback] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filter === 'All' ? orders : orders.filter((o) => o.order_status === filter);
  }, [orders, filter]);

  async function handleCancel(orderId: string) {
    if (!onCancelOrder) return;
    setCancellingId(orderId);
    setCancelFeedback(null);
    const result = await onCancelOrder(orderId);
    setCancelFeedback({ id: orderId, ...result });
    setCancellingId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-black">My Orders</h1>
      <p className="mt-1 text-sm text-brand-gray">All pre-orders you have placed with the canteen.</p>

      {cancelFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            cancelFeedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {!cancelFeedback.ok && <XCircle className="h-5 w-5 shrink-0" />}
          {cancelFeedback.message}
        </div>
      )}

      {showSearch && onSearch && (
        <div className="mt-5 max-w-md">
          <SearchInput
            value={search}
            onChange={onSearch}
            onClear={() => onSearch('')}
            placeholder="Search food, orders..."
            ariaLabel="Search your orders"
          />
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`focus-ring whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-border bg-white text-brand-gray hover:border-brand-gold hover:text-brand-dark'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <SectionTitle>Orders ({filtered.length})</SectionTitle>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-brand-beige/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No orders here yet" hint="Place a pre-order from the food menu to get started." />
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <Card key={o.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-dark">
                        #{o.id.slice(-8)}
                      </span>
                      <StatusBadge status={o.order_status} />
                    </div>
                    <p className="mt-1.5 text-sm text-brand-gray">
                      {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ') || 'No items'}
                    </p>
                    <p className="mt-1 text-xs text-brand-gray/80">
                      Placed {new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      {' · '}Pickup {slotLabel(o.pickup_slot_id)}
                    </p>
                    {o.order_status === 'Cancelled' && o.cancelled_at && (
                      <p className="mt-0.5 text-xs text-red-500">
                        Cancelled {new Date(o.cancelled_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-extrabold text-brand-primary">{orderTotal(o)}</span>
                    <button
                      onClick={() => onNavigate('tracking')}
                      className="focus-ring rounded-xl border border-brand-primary/30 px-4 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-beige"
                    >
                      Track
                    </button>
                    {onCancelOrder && canCancel(o) && (
                      <button
                        onClick={() => handleCancel(o.id)}
                        disabled={cancellingId === o.id}
                        className="focus-ring rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                      >
                        {cancellingId === o.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
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
