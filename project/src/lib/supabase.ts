import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Core domain types (match the academic SQL schema exactly) ───────────────

export type MenuItem = {
  id: string;        // item_id from DB, aliased via select "item_id as id"
  name: string;      // item_name from DB
  description: string | null;
  price: number;
  category: string | null;    // category_name from joined categories table
  category_id: number | null; // raw FK
  is_available: boolean;
  image_url: string | null;
  stock_quantity: number | null; // stock_qty from DB, aliased
  updated_at: string | null;
};

export type PickupSlot = {
  id: string;          // slot_id from DB, aliased
  slot_time: string;   // computed as slot_date + ' ' + start_time (ISO string)
  slot_date: string;
  start_time: string;
  end_time: string;
  max_orders: number | null;
  is_active: boolean;
};

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready for Pickup' | 'Completed' | 'Cancelled';

export type Order = {
  id: string;                    // order_id from DB, aliased
  user_id: string | null;
  pickup_slot_id: string | null; // slot_id from DB, aliased
  order_status: OrderStatus;
  total_amount: number | null;
  created_at: string;
  cancelled_at: string | null;
  notes: string | null;
};

export type OrderItem = {
  id: string;             // order_item_id aliased
  order_id: string;
  menu_item_id: string;   // item_id aliased
  quantity: number;
  price: number | null;   // unit_price aliased
  subtotal: number | null;
};

/**
 * Student profile type — mirrors the `users` table.
 * The `id` column is the Supabase auth UUID (linked via `auth.uid()`).
 */
export type StudentProfile = {
  id: string;
  name: string;        // full_name from DB
  student_id: string;
  department: string;
  program: string;
  email: string;
  phone: string | null;
};

export const MOCK_STUDENT: StudentProfile = {
  id: 'demo-student',
  name: 'Ayesha Rahman',
  student_id: 'VU-2023-0148',
  department: 'Computer Science & Engineering',
  program: 'B.Sc. Engineering',
  email: 'ayesha.rahman@varendra.edu.bd',
  phone: null,
};

export const BDT_RATE = 1; // prices are stored in BDT directly

export function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `৳${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

// ─── Supabase query helpers ──────────────────────────────────────────────────

/**
 * Select string for menu_items that maps DB column names to our MenuItem type.
 * We join categories to get category_name as the display category.
 */
export const MENU_SELECT =
  'item_id, item_name, description, price, is_available, image_url, stock_qty, updated_at, category_id, categories(category_name)';

/** Map a raw DB row to MenuItem */
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

/** Select string for pickup_slots */
export const SLOT_SELECT = 'slot_id, slot_date, start_time, end_time, max_orders, is_active';

/** Map a raw DB row to PickupSlot */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSlot(row: any): PickupSlot {
  // Build an ISO-like string: "YYYY-MM-DD HH:MM" for display/sorting
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

/** Select string for orders */
export const ORDER_SELECT =
  'order_id, user_id, slot_id, order_status, total_amount, order_date, cancelled_at, notes';

/** Map a raw DB row to Order */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapOrder(row: any): Order {
  return {
    id: String(row.order_id),
    user_id: row.user_id ? String(row.user_id) : null,
    pickup_slot_id: row.slot_id != null ? String(row.slot_id) : null,
    order_status: (row.order_status as OrderStatus) ?? 'Pending',
    total_amount: row.total_amount != null ? Number(row.total_amount) : null,
    created_at: row.order_date ?? row.created_at ?? new Date().toISOString(),
    cancelled_at: row.cancelled_at ?? null,
    notes: row.notes ?? null,
  };
}
