// Central type definitions used by both frontend and backend (frontend only)
// These are copies of the definitions that originally lived in supabase.ts,
// but without any Supabase client code.

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

export type PickupSlot = {
  id: string;
  slot_time: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_orders: number | null;
  is_active: boolean;
};

export type OrderStatus =
  | 'Pending'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'Picked_Up'
  | 'Rejected'
  | 'Cancelled'
  | 'Expired';

export type Order = {
  id: string;
  user_id: string | null;
  pickup_slot_id: string | null;
  order_status: OrderStatus;
  total_amount: number | null;
  created_at: string;
  cancelled_at: string | null;
  notes: string | null;
};

export type StudentProfile = {
  id: string;
  name: string;
  student_id: string;
  department: string;
  program?: string;
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

export const BDT_RATE = 1;

export function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `৳${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}
