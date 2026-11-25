// Shared helper functions for backend mapping of DB rows to domain objects.
// These were originally in src/lib/supabase.ts but have been moved to avoid loading
// environment‑specific Supabase configuration on the backend.

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  category_id: number | null;
  is_available: boolean;
  image_url: string | null;
  stock_quantity: number | null;
  updated_at: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMenuItem(row: any): MenuItem {
  return {
    id: String(row.item_id),
    name: row.item_name ?? '',
    description: row.description ?? null,
    price: Number(row.price ?? 0),
    category: row.categories?.category_name ?? null,
    category_id: row.category_id ?? null,
    is_available: Boolean(row.is_available),
    image_url: row.image_url ?? null,
    stock_quantity: row.stock_qty ?? null,
    updated_at: row.updated_at ?? null,
  };
}
