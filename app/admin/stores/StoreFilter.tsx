'use client';

import { useRouter } from 'next/navigation';

export function StoreFilter({ filter, sort }: { filter: string; sort: string }) {
  const router = useRouter();

  const setParam = (key: 'filter' | 'sort', value: string) => {
    const params = new URLSearchParams({ filter, sort, [key]: value });
    router.push(`/admin/stores?${params.toString()}`);
  };

  return (
    <div className="flex gap-3 items-center flex-wrap">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {[
          ['all', 'All stores'],
          ['with_pending', 'With pending'],
          ['no_pending', 'All clear'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setParam('filter', k)}
            className={`text-xs px-3 py-1 rounded-md ${filter === k ? 'bg-white shadow font-medium text-slate-900' : 'text-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Sort by:</span>
        <select value={sort} onChange={e => setParam('sort', e.target.value)}
          className="px-2 py-1 border border-slate-200 rounded-md">
          <option value="pending_count">Pending (high to low)</option>
          <option value="critical_pending">Critical (high to low)</option>
          <option value="total_tickets">Total tickets</option>
        </select>
      </div>
    </div>
  );
}
