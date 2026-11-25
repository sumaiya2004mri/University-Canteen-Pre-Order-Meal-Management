import { useState } from 'react';
import { LifeBuoy, MessageCircle, Phone } from 'lucide-react';
import { Card, SectionTitle, StudentInfoRow } from '@/components/ui';
import type { StudentProfile } from '@/lib/types';

export function HelpPage() {
  const faqs = [
    {
      q: 'How do pre-orders work?',
      a: 'Browse the menu, add items to your cart, choose a pickup time slot, and place your order. The canteen prepares it before your slot so you skip the line.',
    },
    {
      q: 'Can I cancel or change an order?',
      a: 'Orders can be adjusted while their status is still Pending. Contact the canteen counter or Help & Support as soon as possible.',
    },
    {
      q: 'Where do I pick up my food?',
      a: 'At the CampusBites counter in the Varendra University canteen, during the pickup slot you selected.',
    },
    {
      q: 'How do I pay?',
      a: 'Pay at pickup by cash or mobile financial services (bKash, Nagad). Card payments are coming soon.',
    },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-brand-black">Help & Support</h1>
      <p className="mt-1 text-sm text-brand-gray">Questions about ordering? We have answers.</p>

      <Card className="mt-6 divide-y divide-brand-border/60">
        {faqs.map((f, i) => (
          <div key={f.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="focus-ring flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span className="text-sm font-semibold text-brand-black">{f.q}</span>
              <span aria-hidden="true" className="text-brand-gold">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="px-4 pb-4 text-sm text-brand-gray">{f.a}</p>}
          </div>
        ))}
      </Card>

      <Card className="mt-6 p-5">
        <SectionTitle>Contact the Canteen</SectionTitle>
        <div className="space-y-3">
          <p className="flex items-center gap-2.5 text-sm text-brand-gray">
            <Phone className="h-4 w-4 text-brand-gold" /> Canteen counter: +880 1XXX-XXXXXX
          </p>
          <p className="flex items-center gap-2.5 text-sm text-brand-gray">
            <MessageCircle className="h-4 w-4 text-brand-gold" /> campusbites@varendra.edu.bd
          </p>
          <p className="flex items-center gap-2.5 text-sm text-brand-gray">
            <LifeBuoy className="h-4 w-4 text-brand-gold" /> Open Sunday–Thursday, 8:00 AM – 5:00 PM
          </p>
        </div>
      </Card>
    </div>
  );
}

export function SettingsPage({ student }: { student: StudentProfile }) {
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-brand-black">Settings</h1>
      <p className="mt-1 text-sm text-brand-gray">Manage your CampusBites preferences.</p>

      <Card className="mt-6 p-6">
        <SectionTitle>Account</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentInfoRow label="Name" value={student.name} />
          <StudentInfoRow label="University Email" value={student.email} />
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <SectionTitle>Notifications</SectionTitle>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-brand-black">Order updates</span>
              <span className="block text-xs text-brand-gray">Status changes for your pre-orders.</span>
            </span>
            <input
              type="checkbox"
              checked={notifyOrders}
              onChange={(e) => setNotifyOrders(e.target.checked)}
              className="focus-ring h-5 w-5 accent-brand-primary"
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-brand-black">Menu announcements</span>
              <span className="block text-xs text-brand-gray">New items added to the canteen menu.</span>
            </span>
            <input
              type="checkbox"
              checked={notifyPromos}
              onChange={(e) => setNotifyPromos(e.target.checked)}
              className="focus-ring h-5 w-5 accent-brand-primary"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}

export function LogoutPage({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <p className="text-lg font-bold text-brand-black">Log out of CampusBites?</p>
        <p className="mt-2 text-sm text-brand-gray">
          You will need to sign in again to place pre-orders and track your canteen orders.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onConfirm}
            className="focus-ring rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Yes, Log Out
          </button>
          <span className="text-sm text-brand-gray self-center">or go back from the menu</span>
        </div>
      </Card>
    </div>
  );
}
