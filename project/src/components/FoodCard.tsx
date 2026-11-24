import { Clock, Plus } from 'lucide-react';
import { formatBDT, type MenuItem } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';

const CATEGORY_EMOJI: Record<string, string> = {
  'Burger': '🍔',
  'Burgers': '🍔',
  'Rice': '🍛',
  'Biryani': '🍛',
  'Sandwich': '🥪',
  'Sandwiches': '🥪',
  'Juice': '🧃',
  'Drinks': '🧃',
  'Beverages': '🧃',
  'Pizza': '🍕',
  'Dessert': '🍰',
  'Desserts': '🍰',
  'Snacks': '🍟',
};

export default function FoodCard({ item }: { item: MenuItem }) {
  const { add, lines, setQty } = useCart();
  const line = lines.find((l) => l.item.id === item.id);
  const emoji = (item.category && CATEGORY_EMOJI[item.category]) || '🍽️';

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        aria-hidden="true"
        className="flex h-28 items-center justify-center bg-brand-beige text-4xl transition-transform group-hover:scale-[1.03]"
      >
        <span>{emoji}</span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-brand-black">{item.name}</h3>
          <span className="whitespace-nowrap font-bold text-brand-primary">{formatBDT(item.price)}</span>
        </div>

        <p className="mt-1 text-xs font-medium text-brand-gray">{item.category ?? 'Menu'}</p>

        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-brand-gray">
            <Clock className="h-3.5 w-3.5" />
            10–15 min
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
              item.is_available
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {item.is_available ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div className="mt-3 flex-1" />

        {item.is_available &&
          (line ? (
            <div className="flex items-center justify-between rounded-xl border border-brand-primary/30 bg-brand-beige px-2 py-1.5">
              <button
                onClick={() => setQty(item.id, line.quantity - 1)}
                aria-label={`Remove one ${item.name} from cart`}
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-brand-primary hover:bg-brand-border/60"
              >
                −
              </button>
              <span className="text-sm font-bold text-brand-dark">{line.quantity} in cart</span>
              <button
                onClick={() => setQty(item.id, line.quantity + 1)}
                aria-label={`Add one ${item.name} to cart`}
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-brand-primary hover:bg-brand-border/60"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={() => add(item)}
              className="focus-ring mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              <Plus className="h-4 w-4" />
              Add to Cart
            </button>
          ))}
    </div>
  </div>
  );
}
