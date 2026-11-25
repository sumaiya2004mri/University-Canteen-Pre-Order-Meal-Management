// Mapping utilities extracted from supabase.ts to avoid importing the Supabase client in the frontend.
// These are pure functions and constant SELECT strings used by the frontend for data shaping.

export const MENU_SELECT =
  'item_id, item_name, description, price, is_available, image_url, stock_qty, updated_at, category_id, categories(category_name)';
export const SLOT_SELECT = 'slot_id, slot_date, start_time, end_time, max_orders, is_active';
export const ORDER_SELECT =
  'order_id, user_id, slot_id, order_status, total_amount, order_date, cancelled_at, notes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMenuItem(row: any) {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSlot(row: any) {
  const slotTime = `${row.slot_date}T${row.start_time}`;
  return {
    id: String(row.slot_id),
    slot_time: slotTime,
    slot_date: row.slot_date,
    start_time: row.start_time,
    end_time: row.end_time,
    max_orders: row.max_orders ?? null,
    is_active: Boolean(row.is_active),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOrder(row: any) {
  return {
    id: String(row.order_id),
    user_id: row.user_id ? String(row.user_id) : null,
    pickup_slot_id: row.slot_id != null ? String(row.slot_id) : null,
    order_status: (row.order_status) ?? 'Pending',
    total_amount: row.total_amount != null ? Number(row.total_amount) : null,
    created_at: row.order_date ?? row.created_at ?? new Date().toISOString(),
    cancelled_at: row.cancelled_at ?? null,
    notes: row.notes ?? null,
  };
}
