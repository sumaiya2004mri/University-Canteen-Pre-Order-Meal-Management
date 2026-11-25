import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardShell from '@/components/DashboardShell';
import AdminShell from '@/components/AdminShell';
import DashboardPage from '@/pages/DashboardPage';
import MenuPage from '@/pages/MenuPage';
import CartPage from '@/pages/CartPage';
import OrdersTablePage, { type OrderWithItems } from '@/pages/OrdersTablePage';
import TrackingPage from '@/pages/TrackingPage';
import HistoryPage from '@/pages/HistoryPage';
import { ProfilePage, StudentInfoPage } from '@/pages/ProfilePages';
import NotificationsPage from '@/pages/NotificationsPage';
import { HelpPage, LogoutPage, SettingsPage } from '@/pages/ServicePages';
import AuthPage from '@/pages/AuthPage';
import AdminDashboard, { type AdminOrder } from '@/pages/AdminDashboard';
import AdminOrders, { AdminCategories, AdminMenu } from '@/pages/AdminOps';
import { AdminSlots, AdminStock, AdminReports } from '@/pages/AdminOps2';
import { AdminProfilePage, AdminSettingsPage } from '@/pages/AdminAccount';
import StaffView from '@/components/StaffView';
import { CartProvider, useCart } from '@/context/CartContext';
import { fetchProfile, getSession, signOut, type SessionUser } from '@/lib/auth';
import {
  MOCK_STUDENT,
  type MenuItem,
  type Order,
  type OrderStatus,
  type PickupSlot,
} from '@/lib/types';
import { MENU_SELECT, SLOT_SELECT, ORDER_SELECT, mapMenuItem, mapSlot, mapOrder } from '@/lib/mappers';
import type { AdminPage, AppNotification, Page } from '@/types';

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

type OrderItemRow = {
  order_item_id: string;
  order_id: number | string;
  quantity: number | null;
  unit_price: number | null;
  menu_items: { item_name: string } | null;
};

function CampusBitesApp() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [page, setPage] = useState<Page>('dashboard');
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  const [student, setStudent] = useState<SessionUser | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [search, setSearch] = useState('');
  const { lines: cartLines, total: cartTotal, clear: clearCart } = useCart();

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Auth initialization – using backend session handling.
  useEffect(() => {
    async function init() {
      const user = await getSession();
      setSession(user);
      setStudent(user);
      setAuthLoading(false);
    }
    init();
    // No Supabase auth subscription needed.
  }, []);

  // ── Load menu ─────────────────────────────────────────────────────────────
// Load menu via Express API
  const loadMenu = useCallback(async () => {
    setLoadingMenu(true);
    setMenuError(null);
    try {
      const resp = await fetch('/api/menu');
      if (!resp.ok) throw new Error('Failed to fetch menu');
      const data = await resp.json();
      setMenuItems(data.map(mapMenuItem));
    } catch (e: any) {
      setMenuError(e.message);
      setMenuItems([]);
    }
    setLoadingMenu(false);
  }, []);

  // Load orders, items, slots via Express API
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const resp = await fetch('/api/orders');
      if (!resp.ok) throw new Error('Failed to fetch orders');
      const { orders, items, slots } = await resp.json();
      // Map orders
      const rawOrders = (orders ?? []).map(mapOrder);
      // Parse items
      const allItems = (items ?? []).map((row: any) => ({
        order_item_id: String(row.order_item_id ?? row.id),
        order_id: row.order_id,
        quantity: row.quantity ?? 0,
        unit_price: row.unit_price ?? row.price ?? null,
        menu_items: row.menu_items
          ? { item_name: row.menu_items.item_name ?? row.menu_items.name ?? 'Unknown' }
          : null,
      }));
      setOrders(
        rawOrders.map((o) => ({
          ...o,
          items: allItems
            .filter((it) => String(it.order_id) === o.id)
            .map((it) => ({ name: it.menu_items?.item_name ?? 'Unknown item', quantity: it.quantity ?? 0 })),
        }))
      );
      // Set slots
      if (Array.isArray(slots)) {
        setSlots(slots.map(mapSlot));
      }
    } catch (e: any) {
      setOrdersError(e.message);
      setOrders([]);
      setSlots([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    loadMenu();
    loadOrders();
  }, [session, loadMenu, loadOrders]);

  // ── Slot label ────────────────────────────────────────────────────────────
  const slotLabel = useCallback(
    (slotId: string | null) => {
      if (!slotId) return 'No slot';
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return 'No slot';
      try {
        const dt = new Date(slot.slot_time);
        const datePart = dt.toLocaleDateString([], { day: 'numeric', month: 'short' });
        const timePart = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${datePart}, ${timePart}`;
      } catch {
        return slot.slot_time;
      }
    },
    [slots],
  );

  // ── User directory (for admin view of student names) ──────────────────────
  const userDirectory = useMemo(() => {
    return new Map<string, { name: string; studentId: string }>();
  }, []);

  const studentName = useCallback(
    (userId: string | null) =>
      userDirectory.get(userId ?? '')?.name ?? (userId === student?.id ? student.name : 'Student'),
    [userDirectory, student],
  );
  const studentIdLabel = useCallback(
    (userId: string | null) =>
      userDirectory.get(userId ?? '')?.studentId ??
      (userId === student?.id ? student.student_id : '—'),
    [userDirectory, student],
  );

  // ── Place Order (via RPC → place_order PostgreSQL function) ───────────────
  const placeOrder = useCallback(
    async (
      slotId: string,
      _total: number,
      lines: { menu_item_id: string; quantity: number; price: number }[],
      notes?: string,
    ): Promise<{ ok: boolean; message: string; orderId?: string }> => {
      if (!student) return { ok: false, message: 'Please sign in to place an order.' };

      // Build the JSONB array expected by place_order(p_user_id, p_slot_id, p_items, p_notes)
      const itemsJson = lines.map((l) => ({
        item_id: Number(l.menu_item_id),
        quantity: l.quantity,
      }));

      try {
        const { data, error } = await supabase.rpc('place_order', {
          p_user_id: Number(student.id) || student.id,
          p_slot_id: Number(slotId),
          p_items: itemsJson,
          p_notes: notes ?? null,
        });

        if (error) {
          // Fallback: direct insert (for schemas without the place_order function)
          return await placeOrderDirect(slotId, lines, notes);
        }

        const orderId = data?.order_id ? String(data.order_id) : undefined;
        clearCart();
        await loadOrders();
        setNotifications((prev) => [
          {
            id: `order-${orderId ?? Date.now()}`,
            title: 'Order placed',
            body: 'Your pre-order has been sent to the canteen.',
            time: 'Just now',
            read: false,
            kind: 'order',
          },
          ...prev,
        ]);
        return {
          ok: true,
          message: 'Order placed successfully! Your food will be ready at your pickup slot.',
          orderId,
        };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Something went wrong.' };
      }
    },
    [student, clearCart, loadOrders], // placeOrderDirect is defined below
  );

  /** Direct insert fallback when place_order() RPC is not available */
  const placeOrderDirect = useCallback(
    async (
      slotId: string,
      lines: { menu_item_id: string; quantity: number; price: number }[],
      notes?: string,
    ): Promise<{ ok: boolean; message: string; orderId?: string }> => {
      if (!student) return { ok: false, message: 'Not signed in.' };
      try {
        // Compute total
        const total = lines.reduce((s, l) => s + l.quantity * l.price, 0);

        // Insert order — try new schema first (slot_id), then old (pickup_slot_id)
        let orderData: { order_id?: number; id?: string } | null = null;
        const { data: o1, error: e1 } = await supabase
          .from('orders')
          .insert({
            user_id: student.id,
            slot_id: Number(slotId),
            order_status: 'Pending',
            total_amount: total,
            notes: notes ?? null,
          })
          .select('order_id')
          .maybeSingle();

        if (e1) {
          // Try old schema
          const { data: o2, error: e2 } = await supabase
            .from('orders')
            .insert({
              user_id: student.id,
              pickup_slot_id: slotId,
              order_status: 'Pending',
              total_amount: total,
            })
            .select('id')
            .maybeSingle();
          if (e2) throw e2;
          orderData = o2;
        } else {
          orderData = o1;
        }

        if (!orderData) throw new Error('Order could not be created');
        const orderId = String(orderData.order_id ?? orderData.id);

        // Insert order items — try new schema (item_id, unit_price), then old
        const { error: ie1 } = await supabase.from('order_items').insert(
          lines.map((l) => ({
            order_id: Number(orderId),
            item_id: Number(l.menu_item_id),
            quantity: l.quantity,
            unit_price: l.price,
            subtotal: l.quantity * l.price,
          })),
        );
        if (ie1) {
          // Old schema fallback
          await supabase.from('order_items').insert(
            lines.map((l) => ({
              order_id: orderId,
              menu_item_id: l.menu_item_id,
              quantity: l.quantity,
              price: l.price,
            })),
          );
        }

        clearCart();
        await loadOrders();
        setNotifications((prev) => [
          {
            id: `order-${orderId}`,
            title: 'Order placed',
            body: 'Your pre-order has been sent to the canteen.',
            time: 'Just now',
            read: false,
            kind: 'order',
          },
          ...prev,
        ]);
        return {
          ok: true,
          message: 'Order placed successfully! Your food will be ready at your pickup slot.',
          orderId,
        };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Failed to place order.' };
      }
    },
    [student, clearCart, loadOrders],
  );

  // ── Cancel Order (via RPC → cancel_order PostgreSQL function) ─────────────
  const cancelOrder = useCallback(
    async (orderId: string): Promise<{ ok: boolean; message: string }> => {
      if (!student) return { ok: false, message: 'Please sign in.' };

      // Try the cancel_order() stored function first
      const { error } = await supabase.rpc('cancel_order', {
        p_order_id: Number(orderId),
        p_user_id: Number(student.id) || student.id,
      });

      if (error) {
        // Fallback: direct status update (without stock restoration)
        const order = orders.find((o) => o.id === orderId);
        if (!order) return { ok: false, message: 'Order not found.' };
        if (order.order_status === 'Cancelled')
          return { ok: false, message: 'Order is already cancelled.' };
        if (!['Pending', 'Preparing'].includes(order.order_status))
          return { ok: false, message: `Orders in "${order.order_status}" status cannot be cancelled.` };

        // Check 15-minute cutoff
        const placed = new Date(order.created_at).getTime();
        if (Date.now() - placed > 15 * 60 * 1000) {
          return {
            ok: false,
            message: 'Cancellation window has passed (15 minutes after order placement).',
          };
        }

        const { error: ue } = await supabase
          .from('orders')
          .update({ order_status: 'Cancelled', cancelled_at: new Date().toISOString() })
          .eq('order_id', Number(orderId));

        if (ue) {
          // Try old schema id column
          const { error: ue2 } = await supabase
            .from('orders')
            .update({ order_status: 'Cancelled' })
            .eq('id', orderId);
          if (ue2) return { ok: false, message: `Cancellation failed: ${ue2.message}` };
        }
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, order_status: 'Cancelled' as OrderStatus, cancelled_at: new Date().toISOString() }
            : o,
        ),
      );
      setNotifications((prev) => [
        {
          id: `cancel-${orderId}`,
          title: 'Order cancelled',
          body: 'Your order has been cancelled successfully.',
          time: 'Just now',
          read: false,
          kind: 'order',
        },
        ...prev,
      ]);
      await loadOrders();
      return { ok: true, message: 'Order cancelled successfully.' };
    },
    [student, orders, loadOrders],
  );

  // ── Update order status (admin) ───────────────────────────────────────────
  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      // Try new schema column name first
      let { error } = await supabase
        .from('orders')
        .update({ order_status: status })
        .eq('order_id', Number(orderId));
      if (error) {
        // Old schema
        ({ error } = await supabase.from('orders').update({ order_status: status }).eq('id', orderId));
      }
      if (error) return { ok: false, message: `Failed: ${error.message}` };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o)));
      return { ok: true, message: `Order #${orderId.slice(-6)} marked as ${status}.` };
    },
    [student],
  );

  // ── Save menu item (admin) ────────────────────────────────────────────────
  const saveMenuItem = useCallback(
    async (item: Partial<MenuItem> & { id?: string }): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      const payload: Record<string, unknown> = {
        item_name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.is_available,
      };
      if (item.stock_quantity != null) payload.stock_qty = item.stock_quantity;
      if (item.category) {
        // Look up or use category_id
        if (item.category_id) {
          payload.category_id = item.category_id;
        } else {
          // Try to find category by name
          const { data: catRow } = await supabase
            .from('categories')
            .select('category_id')
            .eq('category_name', item.category)
            .maybeSingle();
          if (catRow) payload.category_id = (catRow as { category_id: number }).category_id;
        }
      }

      const { error } = item.id
        ? await supabase.from('menu_items').update(payload).eq('item_id', Number(item.id))
        : await supabase.from('menu_items').insert(payload);
      if (error) {
        // Fallback old schema
        const oldPayload: Record<string, unknown> = {
          name: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          is_available: item.is_available,
          stock_quantity: item.stock_quantity,
        };
        const { error: e2 } = item.id
          ? await supabase.from('menu_items').update(oldPayload).eq('id', item.id)
          : await supabase.from('menu_items').insert(oldPayload);
        if (e2) return { ok: false, message: e2.message };
      }
      await loadMenu();
      return { ok: true, message: item.id ? 'Menu item updated.' : 'Menu item created.' };
    },
    [student, loadMenu],
  );

  // ── Delete menu item (admin) ──────────────────────────────────────────────
  const deleteMenuItem = useCallback(
    async (item: MenuItem): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      // Check if used in orders — deactivate rather than delete
      const { data: used } = await supabase
        .from('order_items')
        .select('order_item_id')
        .eq('item_id', Number(item.id))
        .limit(1);
      if (!used || used.length === 0) {
        // Try old schema column name
        const { data: used2 } = await supabase
          .from('order_items')
          .select('id')
          .eq('menu_item_id', item.id)
          .limit(1);
        if (used2 && used2.length > 0) {
          await supabase.from('menu_items').update({ is_available: false }).eq('item_id', Number(item.id));
          await loadMenu();
          return { ok: true, message: `"${item.name}" appears in past orders — marked unavailable instead.` };
        }
      }
      if (used && used.length > 0) {
        await supabase.from('menu_items').update({ is_available: false }).eq('item_id', Number(item.id));
        await loadMenu();
        return { ok: true, message: `"${item.name}" appears in past orders — marked unavailable instead.` };
      }
      const { error } = await supabase.from('menu_items').delete().eq('item_id', Number(item.id));
      if (error) {
        const { error: e2 } = await supabase.from('menu_items').delete().eq('id', item.id);
        if (e2) return { ok: false, message: e2.message };
      }
      await loadMenu();
      return { ok: true, message: `"${item.name}" deleted.` };
    },
    [student, loadMenu],
  );

  // ── Update stock (admin) ──────────────────────────────────────────────────
  const updateStock = useCallback(
    async (item: MenuItem, newStock: number): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      if (!Number.isFinite(newStock) || newStock < 0) return { ok: false, message: 'Stock must be ≥ 0.' };
      let { error } = await supabase
        .from('menu_items')
        .update({ stock_qty: newStock })
        .eq('item_id', Number(item.id));
      if (error) {
        ({ error } = await supabase
          .from('menu_items')
          .update({ stock_quantity: newStock })
          .eq('id', item.id));
      }
      if (error) return { ok: false, message: error.message };
      await loadMenu();
      return { ok: true, message: `"${item.name}" stock set to ${newStock}.` };
    },
    [student, loadMenu],
  );

  // ── Create pickup slot (admin) ────────────────────────────────────────────
  const createSlot = useCallback(
    async (slotTime: string): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      const dt = new Date(slotTime);
      const slotDate = dt.toISOString().split('T')[0]; // YYYY-MM-DD
      const startTime = dt.toTimeString().slice(0, 5);  // HH:MM
      // end_time = start + 30 min
      const endDt = new Date(dt.getTime() + 30 * 60 * 1000);
      const endTime = endDt.toTimeString().slice(0, 5);

      // Try new schema
      let { error } = await supabase.from('pickup_slots').insert({
        slot_date: slotDate,
        start_time: startTime,
        end_time: endTime,
        max_orders: 30,
        is_active: true,
      });
      if (error) {
        // Try old schema (slot_time single column)
        ({ error } = await supabase.from('pickup_slots').insert({
          slot_time: dt.toISOString(),
          is_active: true,
        }));
      }
      if (error) return { ok: false, message: error.message };
      await loadOrders();
      return { ok: true, message: 'Pickup slot created.' };
    },
    [student, loadOrders],
  );

  // ── Toggle pickup slot (admin) ────────────────────────────────────────────
  const toggleSlot = useCallback(
    async (slot: PickupSlot): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      let { error } = await supabase
        .from('pickup_slots')
        .update({ is_active: !slot.is_active })
        .eq('slot_id', Number(slot.id));
      if (error) {
        ({ error } = await supabase
          .from('pickup_slots')
          .update({ is_active: !slot.is_active })
          .eq('id', slot.id));
      }
      if (error) return { ok: false, message: error.message };
      await loadOrders();
      return { ok: true, message: `Slot ${slot.is_active ? 'disabled' : 'enabled'}.` };
    },
    [student, loadOrders],
  );

  // ── Category management (admin) ───────────────────────────────────────────
  const saveCategory = useCallback(
    async (newName: string, originalName: string | null): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      if (!newName.trim()) return { ok: false, message: 'Category name cannot be empty.' };

      if (originalName) {
        // Rename: update categories table
        const existing = categories.find((c) => c.name === originalName);
        if (existing && (existing as { category_id?: number }).category_id) {
          const { error } = await supabase
            .from('categories')
            .update({ category_name: newName.trim() })
            .eq('category_id', (existing as { category_id?: number }).category_id);
          if (!error) { await loadMenu(); return { ok: true, message: `Category renamed to "${newName}".` }; }
        }
        // Fallback: update menu_items.category directly
        const { error } = await supabase
          .from('menu_items')
          .update({ category: newName.trim() })
          .eq('category', originalName);
        if (error) return { ok: false, message: error.message };
        await loadMenu();
        return { ok: true, message: `Category renamed to "${newName}".` };
      }

      // Create new category
      const { error } = await supabase.from('categories').insert({ category_name: newName.trim() });
      if (error) {
        return {
          ok: false,
          message: 'New categories appear automatically once a menu item uses them.',
        };
      }
      await loadMenu();
      return { ok: true, message: `Category "${newName}" created.` };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [student, loadMenu],
  );

  const deleteCategory = useCallback(
    async (name: string): Promise<{ ok: boolean; message: string }> => {
      if (student?.role !== 'admin') return { ok: false, message: 'Admin only.' };
      const { error } = await supabase
        .from('menu_items')
        .update({ category_id: null })
        .eq('category', name);
      if (error) {
        const { error: e2 } = await supabase
          .from('menu_items')
          .update({ category: null })
          .eq('category', name);
        if (e2) return { ok: false, message: e2.message };
      }
      await loadMenu();
      return { ok: true, message: `Category "${name}" removed from all items.` };
    },
    [student, loadMenu],
  );

  // ── Categories derived from menu items ────────────────────────────────────
  const categories = useMemo(() => {
    const map = new Map<string, number & { category_id?: number }>();
    const catIds = new Map<string, number>();
    for (const i of menuItems) {
      const c = i.category ?? 'Uncategorized';
      map.set(c, ((map.get(c) as number) ?? 0) + 1);
      if (i.category_id) catIds.set(c, i.category_id);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, category_id: catIds.get(name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems]);

  // ── Notifications & navigation ────────────────────────────────────────────
  const handleOrderPlaced = useCallback(
    (orderId: string) => {
      loadOrders();
      setNotifications((prev) => [
        {
          id: `order-${orderId}`,
          title: 'Order placed',
          body: 'Your pre-order has been sent to the canteen.',
          time: 'Just now',
          read: false,
          kind: 'order',
        },
        ...prev,
      ]);
    },
    [loadOrders],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navigate = useCallback((p: Page) => {
    if (p === 'logout') { signOut(); return; }
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  const adminNavigate = useCallback((p: AdminPage) => {
    if (p === 'logout') { signOut(); return; }
    setAdminPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.slice(-8).toLowerCase().includes(q) ||
        o.order_status.toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q)),
    );
  }, [orders, search]);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-ivory">
        <div className="animate-pulse text-sm font-semibold text-brand-gray">Loading CampusBites…</div>
      </div>
    );
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!session) {
    return <AuthPage onSignedIn={() => { /* onAuthStateChange picks up the session */ }} />;
  }

  // ── Student portal ─────────────────────────────────────────────────────────
  if (student?.role !== 'admin') {
    const studentOrders = orders.filter((o) => o.user_id === student?.id);
    return (
      <>
        <DashboardShell
          page={page}
          onNavigate={navigate}
          student={MOCK_STUDENT_WITH_ID(student)}
          unreadCount={unreadCount}
          onLogout={() => signOut()}
          cartCount={cartLines.reduce((s, l) => s + l.quantity, 0)}
          search={search}
          onSearch={(v) => {
            setSearch(v);
            if (v) setPage((p) => (['orders', 'history', 'menu'].includes(p) ? p : 'orders'));
          }}
        >
          {page === 'dashboard' && (
            <DashboardPage
              student={MOCK_STUDENT_WITH_ID(student)}
              menuItems={menuItems}
              loadingMenu={loadingMenu}
              orders={studentOrders}
              loadingOrders={loadingOrders}
              slotLabel={slotLabel}
              onNavigate={navigate}
              notifications={notifications}
            />
          )}
          {page === 'menu' && <MenuPage items={menuItems} loading={loadingMenu} error={menuError} />}
          {page === 'cart' && (
            <CartPage
              slots={slots}
              onNavigate={navigate}
              placeOrder={placeOrder}
            />
          )}
          {page === 'orders' && (
            <OrdersTablePage
              orders={searchOrders(studentOrders, search)}
              loading={loadingOrders}
              slotLabel={slotLabel}
              onNavigate={navigate}
              onCancelOrder={cancelOrder}
              showSearch
              search={search}
              onSearch={setSearch}
            />
          )}
          {page === 'tracking' && (
            <TrackingPage
              orders={search.trim() ? searchOrders(studentOrders, search) : studentOrders}
              loading={loadingOrders}
              slotLabel={slotLabel}
            />
          )}
          {page === 'history' && (
            <HistoryPage orders={studentOrders} loading={loadingOrders} slotLabel={slotLabel} />
          )}
          {page === 'profile' && <ProfilePage student={MOCK_STUDENT_WITH_ID(student)} />}
          {page === 'student-info' && <StudentInfoPage student={MOCK_STUDENT_WITH_ID(student)} />}
          {page === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
              onMarkRead={(id) =>
                setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
              }
            />
          )}
          {page === 'help' && <HelpPage />}
          {page === 'settings' && <SettingsPage student={MOCK_STUDENT_WITH_ID(student)} />}
          {page === 'staff' && <StaffView slots={slots} />}
          {page === 'logout' && <LogoutPage onConfirm={() => signOut()} />}
        </DashboardShell>
      </>
    );
  }

  // ── Admin console ──────────────────────────────────────────────────────────
  return (
    <AdminShell page={adminPage} onNavigate={adminNavigate} admin={student} onLogout={() => signOut()}>
      {adminPage === 'dashboard' && (
        <AdminDashboard
          orders={orders}
          menuItems={menuItems}
          slots={slots}
          loading={loadingOrders || loadingMenu}
          error={ordersError}
          onRetry={loadOrders}
          slotLabel={slotLabel}
        />
      )}
      {adminPage === 'orders' && (
        <AdminOrders
          orders={orders}
          loading={loadingOrders}
          slotLabel={slotLabel}
          onUpdateStatus={updateOrderStatus}
          studentName={studentName}
          studentId={studentIdLabel}
        />
      )}
      {adminPage === 'menu' && (
        <AdminMenu
          items={menuItems}
          loading={loadingMenu}
          onSave={saveMenuItem}
          onDelete={deleteMenuItem}
          categories={categories.map((c) => c.name)}
        />
      )}
      {adminPage === 'categories' && (
        <AdminCategories
          categories={categories}
          loading={loadingMenu}
          onSave={saveCategory}
          onDelete={(name) => deleteCategory(name)}
        />
      )}
      {adminPage === 'stock' && (
        <AdminStock items={menuItems} loading={loadingMenu} onUpdateStock={updateStock} />
      )}
      {adminPage === 'slots' && (
        <AdminSlots
          slots={slots.map((s) => ({
            ...s,
            reserved: orders.filter(
              (o) => o.pickup_slot_id === s.id && o.order_status !== 'Cancelled',
            ).length,
          }))}
          loading={loadingOrders}
          onCreate={createSlot}
          onToggle={toggleSlot}
        />
      )}
      {(adminPage === 'reports-sales' ||
        adminPage === 'reports-orders' ||
        adminPage === 'reports-inventory') && (
          <AdminReports orders={orders} menuItems={menuItems} loading={loadingOrders} />
        )}
      {adminPage === 'profile' && <AdminProfilePage admin={student} />}
      {adminPage === 'settings' && <AdminSettingsPage admin={student} />}
    </AdminShell>
  );
}

function MOCK_STUDENT_WITH_ID(student: SessionUser | null) {
  return student ? { ...MOCK_STUDENT, ...student } : MOCK_STUDENT;
}

function searchOrders(list: AdminOrder[], search: string): AdminOrder[] {
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (o) =>
      o.id.slice(-8).toLowerCase().includes(q) ||
      o.order_status.toLowerCase().includes(q) ||
      o.items.some((it) => it.name.toLowerCase().includes(q)),
  );
}

export default function AppRoot() {
  return (
    <CartProvider>
      <CampusBitesApp />
    </CartProvider>
  );
}
