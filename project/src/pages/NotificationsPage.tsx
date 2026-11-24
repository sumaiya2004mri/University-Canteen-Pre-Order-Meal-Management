import { Bell, CheckCheck, UtensilsCrossed } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import type { AppNotification } from '@/types';

type Props = {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
};

const KIND_ICON = {
  order: CheckCheck,
  menu: UtensilsCrossed,
  system: Bell,
};

export default function NotificationsPage({ notifications, onMarkAllRead, onMarkRead }: Props) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-black">Notifications</h1>
          <p className="mt-1 text-sm text-brand-gray">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You are all caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="focus-ring rounded-xl border border-brand-primary/30 px-4 py-2.5 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-beige"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-6">
        {notifications.length === 0 ? (
          <EmptyState title="No notifications" hint="Updates about your orders will appear here." />
        ) : (
          <Card className="divide-y divide-brand-border/60">
            {notifications.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  aria-label={`${n.read ? 'Read' : 'Unread'} notification: ${n.title}. Mark as read.`}
                  className={`focus-ring flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-brand-ivory ${
                    !n.read ? 'bg-brand-beige/40' : ''
                  }`}
                >
                  <div className={`rounded-xl p-2 ${n.read ? 'bg-brand-ivory text-brand-gray' : 'bg-brand-primary text-white'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-black">{n.title}</p>
                    <p className="mt-0.5 text-sm text-brand-gray">{n.body}</p>
                    <p className="mt-1 text-xs text-brand-gray/70">{n.time}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-gold" aria-label="Unread" />}
                </button>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
