import { Card, EmptyState, SectionTitle, StatusBadge, orderTotal } from '@/components/ui';
import { formatBDT } from '@/lib/supabase';
import type { OrderWithItems } from '@/pages/OrdersTablePage';

type Props = {
  orders: OrderWithItems[];
  loading: boolean;
  slotLabel: (slotId: string | null) => string;
};

export default function HistoryPage({ orders, loading, slotLabel }: Props) {
  const completed = orders.filter((o) => o.order_status === 'Completed' || o.order_status === 'Cancelled');
  const spent = completed
    .filter((o) => o.order_status === 'Completed')
    .reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-black">Order History</h1>
      <p className="mt-1 text-sm text-brand-gray">Your past purchases from the campus canteen.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-brand-gray">Completed purchases</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-black">
            {completed.filter((o) => o.order_status === 'Completed').length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-brand-gray">Total spent</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-primary">{formatBDT(spent)}</p>
        </Card>
      </div>

      <div className="mt-8">
        <SectionTitle>Past Orders</SectionTitle>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-brand-beige/70" />
            ))}
          </div>
        ) : completed.length === 0 ? (
          <EmptyState title="No past orders yet" hint="Completed and cancelled orders will be kept here." />
        ) : (
          <div className="space-y-3">
            {completed.map((o) => (
              <Card key={o.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-dark">#{o.id.slice(0, 8)}</span>
                      <StatusBadge status={o.order_status} />
                    </div>
                    <p className="mt-1.5 text-sm text-brand-gray">
                      {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ') || 'No items'}
                    </p>
                    <p className="mt-1 text-xs text-brand-gray/80">
                      {new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}Pickup {slotLabel(o.pickup_slot_id)}
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-brand-primary">{orderTotal(o)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
