import { useMemo, useState } from 'react';
import FoodCard from '@/components/FoodCard';
import { EmptyState, SearchInput, useCategoryFilter } from '@/components/ui';
import type { MenuItem } from '@/lib/supabase';

type Props = {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
};

export default function MenuPage({ items, loading, error }: Props) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) if (it.category) set.add(it.category);
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  const byCategory = useCategoryFilter(items, category);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q));
  }, [byCategory, search]);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-black">Browse Food Menu</h1>
          <p className="mt-1 text-sm text-brand-gray">
            Freshly prepared meals from the Varendra University canteen.
          </p>
        </div>
        <div className="md:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search food, orders..."
            ariaLabel="Search the food menu"
          />
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Food categories">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={`focus-ring whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              category === c
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-brand-border bg-white text-brand-gray hover:border-brand-gold hover:text-brand-dark'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-brand-beige/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing matches your search" hint="Try a different keyword or category." />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <FoodCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
