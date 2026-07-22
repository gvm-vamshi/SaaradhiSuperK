'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { X, Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
  storeNames: string[];
  categories: string[];
  currentStore: string;
  currentPriority: string;
  currentCategory: string;
  currentFilter: string;
  currentSearch: string;
}

export function AgentFilters({ storeNames, categories, currentStore, currentPriority, currentCategory, currentFilter, currentSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(currentSearch);

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

  const submitSearch = () => {
    setFilter('search', searchText.trim());
  };

  const clearAll = () => {
    setSearchText('');
    router.push(`/agent?filter=${currentFilter}`);
  };

  const hasFilters = currentStore || currentPriority || currentCategory || currentSearch;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitSearch(); }}
            placeholder="Search ticket code, store, description..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
        <button onClick={submitSearch} className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">
          Search
        </button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <select value={currentStore} onChange={e => setFilter('store', e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
          <option value="">All Stores</option>
          {storeNames.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={currentCategory} onChange={e => setFilter('category', e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={currentPriority} onChange={e => setFilter('priority', e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
          <option value="">All Priorities</option>
          {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-slate-600 hover:text-violet-700 px-2 py-1.5 rounded-lg hover:bg-violet-50">
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}