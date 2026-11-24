import { CheckCircle2, ChefHat, Clock, PackageCheck } from 'lucide-react';
import { Card, EmptyState, StatusBadge, orderTotal } from '@/components/ui';
import type { OrderWithItems } from '@/pages/OrdersTablePage';

type Props = {
  orders: OrderWithItems[];
  loading: boolean;
  slotLabel: (slotId: string | null) => string;
};

const STEPS = [
  { status: 'Pending', label: 'Order Placed', icon: Clock, hint: 'Waiting for the canteen to confirm.' },
  { status: 'Preparing', label: 'Preparing', icon: ChefHat, hint: 'Your food is being prepared.' },
  { status: 'Ready for Pickup', label: 'Ready for Pickup', icon: PackageCheck, hint: 'Collect it at your chosen slot.' },
  { status: 'Completed', label: 'Completed', icon: CheckCircle2, hint: 'Picked up. Enjoy your meal!' },
] as const;

export default function TrackingPage({ orders, loading, slotLabel }: Props) {
  const active = orders.filter((o) => o.order_status !== 'Completed' && o.order_status !== 'Cancelled');
  const stepIndex = (status: string) => STEPS.findIndex((s) => s.status === status);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-black">Order Tracking</h1>
      <p className="mt-1 text-sm text-brand-gray">Follow your active pre-orders in real time.</p>

      <div className="mt-6 space-y-6">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-brand-beige/70" />)
        ) : active.length === 0 ? (
          <EmptyState title="Nothing to track right now" hint="Orders being prepared will show their progress here." />
        ) : (
          active.map((o) => {
            const current = stepIndex(o.order_status);
            return (
              <Card key={o.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-semibold text-brand-dark">#{o.id.slice(0, 8)}</span>
                    <div className="mt-1.5">
                      <StatusBadge status={o.order_status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-brand-primary">{orderTotal(o)}</p>
                    <p className="text-xs text-brand-gray">Pickup {slotLabel(o.pickup_slot_id)}</p>
                  </div>
                </div>

                <ol className="mt-6 grid gap-4 sm:grid-cols-4">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= current;
                    const isCurrent = i === current;
                    return (
                      <li key={step.status} className="relative">
                        <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              done
                                ? 'border-brand-primary bg-brand-primary text-white'
                                : 'border-brand-border bg-white text-brand-gray/50'
                            } ${isCurrent ? 'ring-4 ring-brand-gold/25' : ''}`}
                          >
                            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${done ? 'text-brand-dark' : 'text-brand-gray/60'}`}>
                              {step.label}
                            </p>
                            <p className="mt-0.5 text-xs text-brand-gray/70">{step.hint}</p>
                          </div>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            aria-hidden="true"
                            className={`absolute left-full top-5 hidden h-0.5 w-[calc(100%-2.5rem)] -translate-y-1/2 sm:block ${
                              i < current ? 'bg-brand-primary' : 'bg-brand-border'
                            }`}
                            style={{ width: 'calc(100% - 3.5rem)', left: '3rem' }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-5 border-t border-brand-border pt-4">
                  <p className="text-sm text-brand-gray">
                    Items:{' '}
                    <span className="font-medium text-brand-black">
                      {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                    </span>
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
