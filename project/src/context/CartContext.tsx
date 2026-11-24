import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { MenuItem } from '@/lib/supabase';

export type CartLine = { item: MenuItem; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  add: (item: MenuItem) => void;
  setQty: (itemId: string, qty: number) => void;
  remove: (itemId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      total: lines.reduce((s, l) => s + l.quantity * Number(l.item.price), 0),
      add: (item) =>
        setLines((prev) => {
          const existing = prev.find((l) => l.item.id === item.id);
          if (existing) {
            return prev.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
          }
          return [...prev, { item, quantity: 1 }];
        }),
      setQty: (itemId, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.item.id !== itemId)
            : prev.map((l) => (l.item.id === itemId ? { ...l, quantity: qty } : l)),
        ),
      remove: (itemId) => setLines((prev) => prev.filter((l) => l.item.id !== itemId)),
      clear: () => setLines([]),
    }),
    [lines],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
