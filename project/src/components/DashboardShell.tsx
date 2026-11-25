import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChefHat,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  Home,
  IdCard,
  LayoutGrid,
  LogOut,
  Menu as MenuIcon,
  Search,
  Settings,
  ShoppingCart,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { Page } from '@/types';
import type { StudentProfile } from '@/lib/types';

type NavItem = { id: Page; label: string; icon: typeof Home };
type NavSection = { label: string; items: NavItem[] };

const SECTIONS: NavSection[] = [
  {
    label: 'Main Menu',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'menu', label: 'Browse Food Menu', icon: LayoutGrid },
      { id: 'cart', label: 'My Cart', icon: ShoppingCart },
      { id: 'orders', label: 'My Orders', icon: FileText },
      { id: 'tracking', label: 'Order Tracking', icon: Clock },
      { id: 'history', label: 'Order History', icon: FileText },
    ],
  },
  {
    label: 'Student Services',
    items: [
      { id: 'profile', label: 'My Profile', icon: User },
      { id: 'student-info', label: 'Student Information', icon: IdCard },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'staff', label: 'Canteen Staff', icon: ChefHat },
      { id: 'logout', label: 'Logout', icon: LogOut },
    ],
  },
];

export const PAGE_TITLES: Record<Page, { title: string; crumb: string }> = {
  dashboard: { title: 'Dashboard', crumb: 'Dashboard' },
  menu: { title: 'Browse Food Menu', crumb: 'Food Menu' },
  cart: { title: 'My Cart', crumb: 'My Cart' },
  orders: { title: 'My Orders', crumb: 'My Orders' },
  tracking: { title: 'Order Tracking', crumb: 'Order Tracking' },
  history: { title: 'Order History', crumb: 'Order History' },
  profile: { title: 'My Profile', crumb: 'My Profile' },
  'student-info': { title: 'Student Information', crumb: 'Student Information' },
  notifications: { title: 'Notifications', crumb: 'Notifications' },
  help: { title: 'Help & Support', crumb: 'Help & Support' },
  settings: { title: 'Settings', crumb: 'Settings' },
  staff: { title: 'Canteen Staff', crumb: 'Canteen Staff' },
  logout: { title: 'Logout', crumb: 'Logout' },
};

type Props = {
  page: Page;
  onNavigate: (page: Page) => void;
  student: StudentProfile;
  unreadCount: number;
  onLogout: () => void;
  cartCount: number;
  search: string;
  onSearch: (value: string) => void;
  children: React.ReactNode;
};

export default function DashboardShell({
  page,
  onNavigate,
  student,
  unreadCount,
  onLogout,
  cartCount,
  search,
  onSearch,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [page]);

  const activeItem = useMemo(
    () => SECTIONS.flatMap((s) => s.items).find((i) => i.id === page),
    [page],
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="rounded-xl bg-brand-primary p-2 text-white">
          <UtensilsCrossed className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-extrabold leading-tight text-brand-dark">CampusBites</p>
          <p className="text-[11px] font-medium text-brand-gray">Varendra University</p>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
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
                      {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-primary" />}
                      <Icon className={`h-4.5 w-4.5 h-[18px] w-[18px] ${active ? 'text-brand-primary' : 'text-brand-gray'}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.id === 'cart' && cartCount > 0 && (
                        <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[11px] font-bold text-white">
                          {cartCount}
                        </span>
                      )}
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
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-brand-border bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
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
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-brand-border bg-white">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="focus-ring rounded-lg p-2.5 text-brand-gray hover:bg-brand-ivory lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="hidden text-sm text-brand-gray sm:block">
              <ol className="flex items-center gap-1.5">
                <li>CampusBites</li>
                <li aria-hidden="true" className="text-brand-border">/</li>
                <li className="font-semibold text-brand-dark">{activeItem?.label ?? PAGE_TITLES[page].crumb}</li>
              </ol>
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray/60" />
                <input
                  type="search"
                  value={search}
                  aria-label="Search food, orders"
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="Search food, orders..."
                  className="focus-ring w-56 rounded-xl border border-brand-border bg-brand-ivory py-2.5 pl-10 pr-3 text-sm text-brand-black placeholder:text-brand-gray/60 focus:bg-white lg:w-72"
                />
              </div>

              <button
                onClick={() => onNavigate('notifications')}
                aria-label={`Notifications, ${unreadCount} unread`}
                className="focus-ring relative rounded-xl p-2.5 text-brand-gray hover:bg-brand-ivory"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className="focus-ring flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-brand-ivory"
                >
                  <Avatar name={student.name} />
                  <span className="hidden text-left sm:block">
                    <span className="block text-sm font-semibold leading-tight text-brand-black">{student.name}</span>
                    <span className="block text-[11px] text-brand-gray">{student.student_id}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-brand-gray" />
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-brand-border bg-white py-1 shadow-lg"
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigate('profile');
                      }}
                      className="focus-ring flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-brand-gray hover:bg-brand-ivory hover:text-brand-dark"
                    >
                      <User className="h-4 w-4" /> Profile
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigate('settings');
                      }}
                      className="focus-ring flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-brand-gray hover:bg-brand-ivory hover:text-brand-dark"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <div className="my-1 border-t border-brand-border" />
                    <button
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      className="focus-ring flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
