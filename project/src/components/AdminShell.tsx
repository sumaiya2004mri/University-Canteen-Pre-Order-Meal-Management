import { useState } from 'react';
import {
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Settings,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { AdminPage } from '@/types';
import type { SessionUser } from '@/lib/auth';

type NavItem = { id: AdminPage; label: string; icon: typeof LayoutDashboard };
type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: 'Main Menu',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders', icon: ClipboardList },
      { id: 'menu', label: 'Menu Management', icon: UtensilsCrossed },
      { id: 'categories', label: 'Categories', icon: FolderTree },
      { id: 'stock', label: 'Stock Management', icon: Boxes },
      { id: 'slots', label: 'Pickup Slots', icon: CalendarClock },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'reports-sales', label: 'Sales Reports', icon: BarChart3 },
      { id: 'reports-orders', label: 'Order Reports', icon: ClipboardList },
      { id: 'reports-inventory', label: 'Inventory Reports', icon: Boxes },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'profile', label: 'Admin Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'logout', label: 'Logout', icon: LogOut },
    ],
  },
];

export const ADMIN_PAGE_TITLES: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  orders: 'Order Management',
  menu: 'Menu Management',
  categories: 'Category Management',
  stock: 'Stock Management',
  slots: 'Pickup Slot Management',
  'reports-sales': 'Sales Reports',
  'reports-orders': 'Order Reports',
  'reports-inventory': 'Inventory Reports',
  profile: 'Admin Profile',
  settings: 'Settings',
  logout: 'Logout',
};

type Props = {
  page: AdminPage;
  onNavigate: (page: AdminPage) => void;
  admin: SessionUser;
  onLogout: () => void;
  children: React.ReactNode;
};

export default function AdminShell({ page, onNavigate, admin, onLogout, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="rounded-xl bg-brand-primary p-2 text-white">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-extrabold leading-tight text-brand-dark">CampusBites</p>
          <p className="text-[11px] font-medium text-brand-gray">Admin Console · Varendra University</p>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-gray/70">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = page === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => (item.id === 'logout' ? onLogout() : onNavigate(item.id))}
                      aria-current={active ? 'page' : undefined}
                      className={`focus-ring relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-brand-beige text-brand-primary'
                          : 'text-brand-gray hover:bg-brand-ivory hover:text-brand-dark'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-primary" />
                      )}
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="text-left">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-ivory">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-brand-border bg-white lg:block">
        {sidebar}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-brand-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="focus-ring absolute right-3 top-4 rounded-full p-2 text-brand-gray hover:bg-brand-ivory"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-brand-border bg-white">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open admin navigation"
              className="focus-ring rounded-lg p-2.5 text-brand-gray hover:bg-brand-ivory lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-brand-black">{ADMIN_PAGE_TITLES[page]}</h1>
            <div className="ml-auto flex items-center gap-2.5">
              <Avatar name={admin.name} />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight text-brand-black">{admin.name}</span>
                <span className="block text-[11px] font-medium text-brand-gold">Administrator</span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
