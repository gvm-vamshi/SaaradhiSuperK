'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

interface Props {
  storeNames: string[];
  categories: string[];
  currentStore: string;
  currentPriority: string;
  currentCategory: string;
  currentFilter: string;
}

export function AgentFilters({ storeNames, categories, currentStore, currentPriority, currentCategory, currentFilter }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('filter')) params.set('filter', currentFilter);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/agent?${params.toString()}`);
  };

  const clearAll = () => {
    router.push(`/agent?filter=${currentFilter}`);
  };

  const hasFilters = currentStore || currentPriority || currentCategory;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={currentStore}
        onChange={e => setFilter('store', e.target.value)}
        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
      >
        <option value="">All Stores</option>
        {storeNames.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select
        value={currentCategory}
        onChange={e => setFilter('category', e.target.value)}
        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
      >
        <option value="">All Categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        value={currentPriority}
        onChange={e => setFilter('priority', e.target.value)}
        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
      >
        <option value="">All Priorities</option>
        {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {hasFilters && (
        <button onClick={clearAll} className="flex items-center gap-1 text-xs text-slate-600 hover:text-violet-700 px-2 py-1.5 rounded-lg hover:bg-violet-50">
          <X size={12}/> Clear
        </button>
      )}
    </div>
  );
}