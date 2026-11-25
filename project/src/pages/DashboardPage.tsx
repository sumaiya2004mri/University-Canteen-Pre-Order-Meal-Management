import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  History,
  LayoutGrid,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import FoodCard from '@/components/FoodCard';
import { Avatar, Card, EmptyState, SectionTitle, StatusBadge, orderTotal } from '@/components/ui';
import { formatBDT, type MenuItem, type Order, type StudentProfile } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import type { AppNotification, Page } from '@/types';

type OrderWithItems = Order & { items: { id: string; name: string; quantity: number }[] };

type Props = {
  student: StudentProfile;
  menuItems: MenuItem[];
  loadingMenu: boolean;
  orders: OrderWithItems[];
  loadingOrders: boolean;
  slotLabel: (slotId: string | null) => string;
  onNavigate: (page: Page) => void;
  notifications: AppNotification[];
};

const QUICK_ACTIONS: { page: Page; icon: typeof LayoutGrid; title: string; desc: string }[] = [
  { page: 'menu', icon: LayoutGrid, title: 'Browse Food', desc: 'Explore available meals.' },
  { page: 'cart', icon: ShoppingCart, title: 'My Cart', desc: 'Review selected items.' },
  { page: 'tracking', icon: Clock, title: 'Track Order', desc: 'Check current order status.' },
  { page: 'history', icon: History, title: 'Order History', desc: 'View previous purchases.' },
];

export default function DashboardPage({
  student,
  menuItems,
  loadingMenu,
  orders,
  loadingOrders,
  slotLabel,
  onNavigate,
  notifications,
}: Props) {
  const { add } = useCart();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const activeOrders = orders.filter((o) => o.order_status !== 'Completed' && o.order_status !== 'Cancelled');
  const stats = useMemo(
    () => [
      {
        icon: ShoppingBag,
        label: 'Total Orders',
        value: String(orders.length).padStart(2, '0'),
        hint: 'Total orders placed',
        iconBg: 'bg-brand-beige text-brand-primary',
      },
      {
        icon: Clock,
        label: 'Pending Orders',
        value: String(activeOrders.length).padStart(2, '0'),
        hint: 'Orders awaiting preparation',
        iconBg: 'bg-amber-50 text-amber-700',
      },
      {
        icon: CheckCircle,
        label: 'Completed Orders',
        value: String(orders.filter((o) => o.order_status === 'Completed').length).padStart(2, '0'),
        hint: 'Successfully collected',
        iconBg: 'bg-emerald-50 text-emerald-700',
      },
      {
        icon: Wallet,
        label: 'Total Spending',
        value: formatBDT(orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0)),
        hint: 'Your total canteen spending',
        iconBg: 'bg-brand-beige text-brand-gold',
      },
    ],
    [orders, activeOrders.length],
  );

  const popular = useMemo(() => menuItems.filter((i) => i.is_available).slice(0, 6), [menuItems]);
  const recentOrders = orders.slice(0, 5);
  const unread = notifications.filter((n) => !n.read).slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-gold">{dateLabel}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-brand-black sm:text-3xl">
            {greeting}, {student.name.split(' ')[0]}!
          </h1>
          <p className="mt-1.5 text-sm text-brand-gray sm:text-base">
            Welcome back to CampusBites. What would you like to eat today?
          </p>
        </div>
        <button
          onClick={() => onNavigate('menu')}
          className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          Explore Food Menu
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      {/* Stats */}
      <section aria-label="Order statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${s.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-extrabold text-brand-black sm:text-2xl">{s.value}</p>
                  <p className="truncate text-xs font-semibold text-brand-gray">{s.label}</p>
                </div>
              </div>
              <p className="mt-3 truncate text-[11px] text-brand-gray/70">{s.hint}</p>
            </Card>
          );
        })}
      </section>

      {/* Quick actions */}
      <section>
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.title}
                onClick={() => onNavigate(a.page)}
                className="focus-ring group rounded-2xl border border-brand-border bg-white p-4 text-left shadow-sm transition-all hover:border-brand-gold/60 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-brand-beige p-2.5 text-brand-primary transition-colors group-hover:bg-brand-primary group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-black">{a.title}</p>
                    <p className="mt-0.5 text-xs text-brand-gray">{a.desc}</p>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-brand-border transition-transform group-hover:translate-x-0.5 group-hover:text-brand-gold" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popular on campus */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => onNavigate('menu')}
              className="focus-ring inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-brand-primary hover:text-brand-dark"
            >
              View Full Menu
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        >
          Popular on Campus
        </SectionTitle>
        {loadingMenu ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-brand-beige/70" />
            ))}
          </div>
        ) : popular.length === 0 ? (
          <EmptyState title="No menu items yet" hint="Available canteen items will appear here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((item) => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Recent orders + notifications + profile */}
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionTitle
            action={
              <button
                onClick={() => onNavigate('orders')}
                className="focus-ring text-sm font-semibold text-brand-primary hover:text-brand-dark"
              >
                View All Orders
              </button>
            }
          >
            Recent Orders
          </SectionTitle>
          <Card>
            {loadingOrders ? (
              <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No orders yet" hint="Your placed orders will show up here." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-gray/80">
                      <th scope="col" className="px-4 py-3 font-semibold">Order ID</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Food Items</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Pickup Time</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Total</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/60">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-dark">
                          #{o.id.slice(0, 8)}
                        </td>
                        <td className="max-w-52 truncate px-4 py-3 text-brand-gray">
                          {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-brand-gray">{slotLabel(o.pickup_slot_id)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-black">
                          {orderTotal(o)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.order_status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onNavigate('tracking')}
                            className="focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-beige"
                          >
                            Track
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <div className="space-y-6">
          {/* Notifications */}
          <section>
            <SectionTitle
              action={
                <button
                  onClick={() => onNavigate('notifications')}
                  className="focus-ring text-sm font-semibold text-brand-primary hover:text-brand-dark"
                >
                  See All
                </button>
              }
            >
              Notifications
            </SectionTitle>
            <Card className="divide-y divide-brand-border/60">
              {unread.length === 0 ? (
                <p className="p-5 text-sm text-brand-gray">You're all caught up.</p>
              ) : (
                unread.map((n) => (
                  <div key={n.id} className="flex gap-3 p-4">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-gold" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-black">{n.title}</p>
                      <p className="mt-0.5 truncate text-xs text-brand-gray">{n.body}</p>
                      <p className="mt-1 text-[11px] text-brand-gray/70">{n.time}</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </section>

          {/* Student profile card */}
          <section>
            <SectionTitle>Student Profile</SectionTitle>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={student.name} className="h-14 w-14 text-lg" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-brand-black">{student.name}</p>
                  <p className="text-xs text-brand-gray">{student.student_id}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-brand-gold">{student.program}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 border-t border-brand-border pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-gray">Department</dt>
                  <dd className="text-right font-medium text-brand-black">{student.department}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-gray">Email</dt>
                  <dd className="max-w-52 truncate text-right font-medium text-brand-black">{student.email}</dd>
                </div>
              </dl>
              <button
                onClick={() => onNavigate('profile')}
                className="focus-ring mt-4 w-full rounded-xl border border-brand-primary/30 bg-brand-ivory py-2.5 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-beige"
              >
                View Full Profile
              </button>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
