import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, EmptyState, SearchInput, SectionTitle, StatusBadge, orderTotal } from '@/components/ui';
import { formatBDT, type MenuItem, type OrderStatus } from '@/lib/types';
import type { AdminOrder } from '@/pages/AdminDashboard';

export type AdminMenuItem = MenuItem & { stock_quantity?: number | null; created_at?: string | null };

type Props = {
  orders: AdminOrder[];
  loading: boolean;
  slotLabel: (slotId: string | null) => string;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<{ ok: boolean; message: string }>;
  studentName: (userId: string | null) => string;
  studentId: (userId: string | null) => string;
};

const FILTERS: ('All' | OrderStatus)[] = [
  'All',
  'Pending',
  'Preparing',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
];

export default function AdminOrders({ orders, loading, slotLabel, onUpdateStatus, studentName, studentId }: Props) {
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = orders
    .filter((o) => (filter === 'All' ? true : o.order_status === filter))
    .filter((o) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        o.id.slice(0, 8).toLowerCase().includes(q) ||
        studentName(o.user_id).toLowerCase().includes(q) ||
        studentId(o.user_id).toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
      );
    });

  async function handleStatus(order: AdminOrder, status: OrderStatus) {
    setUpdatingId(order.id);
    const result = await onUpdateStatus(order.id, status);
    setFeedback(result);
    if (result.ok) setDetail((d) => (d && d.id === order.id ? { ...d, order_status: status } : d));
    setUpdatingId(null);
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
          {feedback.message}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`focus-ring whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-brand-border bg-white text-brand-gray hover:border-brand-gold hover:text-brand-dark'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="md:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search orders, students, items..."
            ariaLabel="Search orders"
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No orders found" hint="Try a different filter or search term." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-gray/80">
                  <th scope="col" className="px-4 py-3 font-semibold">Order ID</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Student</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Items</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Placed</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Pickup</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Total</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/60">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-dark">#{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-brand-black">{studentName(o.user_id)}</span>
                      <span className="block text-xs text-brand-gray/70">{studentId(o.user_id)}</span>
                    </td>
                    <td className="max-w-52 truncate px-4 py-3 text-brand-gray">
                      {o.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-gray">
                      {new Date(o.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-gray">{slotLabel(o.pickup_slot_id)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-black">{orderTotal(o)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.order_status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(o)}
                        className="focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-beige"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Order ${detail.id.slice(0, 8)} details`}>
          <div className="absolute inset-0 bg-brand-black/40" onClick={() => setDetail(null)} />
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold text-brand-gray">#{detail.id.slice(0, 8)}</p>
                <h2 className="mt-1 text-lg font-bold text-brand-black">Order Details</h2>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Close order details" className="focus-ring rounded-lg p-2 text-brand-gray hover:bg-brand-ivory">
                ✕
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-brand-ivory p-3">
                <dt className="text-xs text-brand-gray">Student</dt>
                <dd className="font-semibold text-brand-black">{studentName(detail.user_id)}</dd>
              </div>
              <div className="rounded-xl bg-brand-ivory p-3">
                <dt className="text-xs text-brand-gray">Student ID</dt>
                <dd className="font-semibold text-brand-black">{studentId(detail.user_id)}</dd>
              </div>
              <div className="rounded-xl bg-brand-ivory p-3">
                <dt className="text-xs text-brand-gray">Placed</dt>
                <dd className="font-semibold text-brand-black">
                  {new Date(detail.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </dd>
              </div>
              <div className="rounded-xl bg-brand-ivory p-3">
                <dt className="text-xs text-brand-gray">Pickup</dt>
                <dd className="font-semibold text-brand-black">{slotLabel(detail.pickup_slot_id)}</dd>
              </div>
            </dl>

            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-gray/80">Items</p>
              <ul className="divide-y divide-brand-border/60 rounded-xl border border-brand-border">
                {detail.items.map((it, idx) => (
                  <li key={`${it.name}-${idx}`} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-brand-black"><span className="font-semibold">{it.quantity}×</span> {it.name}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right text-base font-extrabold text-brand-primary">
                Total: {orderTotal(detail)}
              </p>
            </div>

            <div className="mt-5 border-t border-brand-border pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-gray/80">Update status</p>
              <div className="grid grid-cols-2 gap-2">
                {FILTERS.filter((f) => f !== 'All').map((s) => (
                  <button
                    key={s}
                    disabled={detail.order_status === s || updatingId === detail.id}
                    onClick={() => handleStatus(detail, s as OrderStatus)}
                    className={`focus-ring rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-default ${
                      detail.order_status === s
                        ? 'border-brand-gold bg-brand-beige text-brand-dark ring-2 ring-brand-gold/40'
                        : 'border-brand-border bg-white text-brand-gray hover:border-brand-primary hover:text-brand-primary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminMenu({
  items,
  loading,
  onSave,
  onDelete,
  categories,
}: {
  items: AdminMenuItem[];
  loading: boolean;
  onSave: (item: Partial<AdminMenuItem> & { id?: string }) => Promise<{ ok: boolean; message: string }>;
  onDelete: (item: AdminMenuItem) => Promise<{ ok: boolean; message: string }>;
  categories: string[];
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [editing, setEditing] = useState<Partial<AdminMenuItem> | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminMenuItem | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = items
    .filter((i) => (categoryFilter === 'All' ? true : i.category === categoryFilter))
    .filter((i) =>
      availabilityFilter === 'all' ? true : availabilityFilter === 'available' ? i.is_available : !i.is_available,
    )
    .filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const result = await onSave(editing);
    setFeedback(result);
    if (result.ok) setEditing(null);
    setBusy(false);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    const result = await onDelete(confirmDelete);
    setFeedback(result);
    setConfirmDelete(null);
    setBusy(false);
  }

  const inputClass =
    'w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30';

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" className={`${inputClass} w-auto`}>
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} aria-label="Filter by availability" className={`${inputClass} w-auto`}>
            <option value="all">All availability</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
        <div className="flex gap-2 lg:w-auto">
          <div className="flex-1 lg:w-64">
            <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search food by name..." ariaLabel="Search menu items" />
          </div>
          <button
            onClick={() => setEditing({ is_available: true })}
            className="focus-ring shrink-0 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Add Item
          </button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No menu items found" hint="Add a new item or adjust your filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-gray/80">
                  <th scope="col" className="px-4 py-3 font-semibold">Item</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Available</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/60">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-brand-black">{item.name}</span>
                      {item.description && <span className="block max-w-64 truncate text-xs text-brand-gray/70">{item.description}</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-gray">{item.category ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-black">{formatBDT(item.price)}</td>
                    <td className="px-4 py-3 text-brand-gray">
                      {item.stock_quantity != null ? item.stock_quantity : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {item.is_available ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(item)} className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-beige">Edit</button>
                      <button onClick={() => setConfirmDelete(item)} className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit menu item' : 'Add menu item'}>
          <div className="absolute inset-0 bg-brand-black/40" onClick={() => setEditing(null)} />
          <form onSubmit={handleSave} className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-brand-black">{editing.id ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="mi-name" className="text-sm font-semibold text-brand-dark">Name</label>
                <input id="mi-name" required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="mi-desc" className="text-sm font-semibold text-brand-dark">Description</label>
                <textarea id="mi-desc" rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mi-cat" className="text-sm font-semibold text-brand-dark">Category</label>
                  <input id="mi-cat" list="mi-cats" value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value || null })} className={inputClass} />
                  <datalist id="mi-cats">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="mi-price" className="text-sm font-semibold text-brand-dark">Price (৳)</label>
                  <input id="mi-price" type="number" min="0" step="1" required value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mi-stock" className="text-sm font-semibold text-brand-dark">Stock quantity</label>
                  <input
                    id="mi-stock"
                    type="number"
                    min="0"
                    value={editing.stock_quantity ?? 0}
                    onChange={(e) => setEditing({ ...editing, stock_quantity: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="mi-avail" className="text-sm font-semibold text-brand-dark">Availability</label>
                  <select id="mi-avail" value={editing.is_available ? 'yes' : 'no'} onChange={(e) => setEditing({ ...editing, is_available: e.target.value === 'yes' })} className={inputClass}>
                    <option value="yes">Available</option>
                    <option value="no">Unavailable</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="focus-ring rounded-xl border border-brand-border px-4 py-2.5 text-sm font-semibold text-brand-gray hover:bg-brand-ivory">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="focus-ring rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                {busy ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true" aria-label="Confirm deletion">
          <div className="absolute inset-0 bg-brand-black/40" onClick={() => setConfirmDelete(null)} />
          <Card className="relative max-w-md p-6 text-center">
            <p className="text-lg font-bold text-brand-black">Delete "{confirmDelete.name}"?</p>
            <p className="mt-2 text-sm text-brand-gray">
              This permanently removes the item. If it appears in past orders, consider marking it unavailable instead to preserve order history.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setConfirmDelete(null)} className="focus-ring rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-brand-gray hover:bg-brand-ivory">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={busy} className="focus-ring rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {busy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export function AdminCategories({
  categories,
  loading,
  onSave,
  onDelete,
}: {
  categories: { name: string; count: number }[];
  loading: boolean;
  onSave: (name: string, originalName: string | null) => Promise<{ ok: boolean; message: string }>;
  onDelete: (name: string, count: number) => Promise<{ ok: boolean; message: string }>;
}) {
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    const result = await onSave(newName.trim(), null);
    setFeedback(result);
    if (result.ok) setNewName('');
    setBusy(false);
  }

  async function handleRename(name: string) {
    setBusy(true);
    const result = await onSave(editValue.trim(), name);
    setFeedback(result);
    if (result.ok) setEditingName(null);
    setBusy(false);
  }

  async function handleDelete(name: string, count: number) {
    if (count > 0) {
      setFeedback({ ok: false, message: `"${name}" has ${count} menu item${count !== 1 ? 's' : ''} associated with it. Move those items to another category before deleting.` });
      return;
    }
    setBusy(true);
    const result = await onDelete(name, count);
    setFeedback(result);
    setBusy(false);
  }

  const inputClass =
    'w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-black focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30';

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Card className="p-5">
        <SectionTitle>Add Category</SectionTitle>
        <form onSubmit={handleAdd} className="flex gap-2">
          <label htmlFor="cat-name" className="sr-only">Category name</label>
          <input id="cat-name" required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Snacks" className={inputClass} />
          <button type="submit" disabled={busy} className="focus-ring shrink-0 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            Add
          </button>
        </form>
      </Card>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search categories..." ariaLabel="Search categories" />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-brand-beige/70" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No categories" hint="Categories are derived from the menu items in your database." />
          </div>
        ) : (
          <ul className="divide-y divide-brand-border/60">
            {filtered.map((c) => (
              <li key={c.name} className="flex items-center gap-3 p-4">
                {editingName === c.name ? (
                  <>
                    <input value={editValue} onChange={(e) => setEditValue(e.target.value)} aria-label={`Rename ${c.name}`} className={`${inputClass} flex-1`} />
                    <button onClick={() => handleRename(c.name)} disabled={busy} className="focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-beige">Save</button>
                    <button onClick={() => setEditingName(null)} className="focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-gray hover:bg-brand-ivory">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium text-brand-black">{c.name}</span>
                    <span className="rounded-full bg-brand-beige px-2.5 py-1 text-xs font-semibold text-brand-primary">{c.count} items</span>
                    <button
                      onClick={() => {
                        setEditingName(c.name);
                        setEditValue(c.name);
                      }}
                      className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-beige"
                    >
                      Rename
                    </button>
                    <button onClick={() => handleDelete(c.name, c.count)} disabled={busy} className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
