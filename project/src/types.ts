export type Page =
  | 'dashboard'
  | 'menu'
  | 'cart'
  | 'orders'
  | 'tracking'
  | 'history'
  | 'profile'
  | 'student-info'
  | 'notifications'
  | 'help'
  | 'settings'
  | 'staff'
  | 'logout';

export type AdminPage =
  | 'dashboard'
  | 'orders'
  | 'menu'
  | 'categories'
  | 'stock'
  | 'slots'
  | 'reports-sales'
  | 'reports-orders'
  | 'reports-inventory'
  | 'profile'
  | 'settings'
  | 'logout';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: 'order' | 'menu' | 'system';
};
