import { useState } from 'react';
import { CheckCircle2, Clock, Minus, Plus, Trash2 } from 'lucide-react';
import { Card, EmptyState, SectionTitle } from '@/components/ui';
import { formatBDT, type PickupSlot } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import type { Page } from '@/types';

type Props = {
  slots: PickupSlot[];
  onNavigate: (page: Page) => void;
  placeOrder: (slotId: string, total: number, lines: { menu_item_id: string; quantity: number; price: number }[]) => Promise<{ ok: boolean; message: string }>;
};

export default function CartPage({ slots, onNavigate, placeOrder }: Props) {
  const { lines, total, count, setQty, remove, clear } = useCart();
  const [slotId, setSlotId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function handlePlace() {
    if (!slotId) {
      setFeedback({ ok: false, message: 'Please choose a pickup time slot.' });
      return;
    }
    setPlacing(true);
    setFeedback(null);
    const result = await placeOrder(
      slotId,
      total,
      lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity, price: Number(l.item.price) })),
    );
    setFeedback(result);
    if (result.ok) {
      clear();
      setSlotId('');
    }
    setPlacing(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-black">My Cart</h1>
      <p className="mt-1 text-sm text-brand-gray">Review your tray before placing the pre-order.</p>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.ok && <CheckCircle2 className="h-5 w-5 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <SectionTitle>Items ({count})</SectionTitle>
          {lines.length === 0 ? (
            <EmptyState title="Your tray is empty" hint="Browse the food menu to add items." />
          ) : (
            <Card className="divide-y divide-brand-border/60">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-4 p-4">
                  <div
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-beige text-2xl"
                  >
                    🍽️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-black">{l.item.name}</p>
                    <p className="text-xs text-brand-gray">{formatBDT(l.item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setQty(l.item.id, l.quantity - 1)}
                      aria-label={`Decrease quantity of ${l.item.name}`}
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-gray hover:border-brand-primary hover:text-brand-primary"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-bold">{l.quantity}</span>
                    <button
                      onClick={() => setQty(l.item.id, l.quantity + 1)}
                      aria-label={`Increase quantity of ${l.item.name}`}
                      className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-gray hover:border-brand-primary hover:text-brand-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="min-w-16 text-right font-bold text-brand-dark">
                    {formatBDT(l.quantity * Number(l.item.price))}
                  </span>
                  <button
                    onClick={() => remove(l.item.id)}
                    aria-label={`Remove ${l.item.name} from cart`}
                    className="focus-ring rounded-lg p-2 text-brand-gray/70 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </Card>
          )}
        </section>

        <aside className="h-fit lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="font-bold text-brand-black">Order Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-gray">Subtotal ({count} items)</dt>
                <dd className="font-semibold text-brand-black">{formatBDT(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-gray">Service charge</dt>
                <dd className="font-semibold text-emerald-700">Free</dd>
              </div>
              <div className="flex justify-between border-t border-brand-border pt-3 text-base">
                <dt className="font-bold text-brand-black">Total</dt>
                <dd className="font-extrabold text-brand-primary">{formatBDT(total)}</dd>
              </div>
            </dl>

            <label htmlFor="pickup-slot" className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
              <Clock className="h-4 w-4 text-brand-gold" />
              Pickup time slot
            </label>
            <select
              id="pickup-slot"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            >
              <option value="">Choose a time...</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </option>
              ))}
            </select>

            <button
              onClick={handlePlace}
              disabled={placing || lines.length === 0 || !slotId}
              className="focus-ring mt-5 w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-brand-border disabled:text-brand-gray"
            >
              {placing ? 'Placing order...' : 'Place Pre-Order'}
            </button>

            <button
              onClick={() => onNavigate('menu')}
              className="focus-ring mt-2.5 w-full rounded-xl border border-brand-primary/30 py-3 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-beige"
            >
              Continue Browsing
            </button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
