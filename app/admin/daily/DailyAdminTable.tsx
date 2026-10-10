'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dailyStatusEmoji, rupees, type SpDailyMessage } from '@/lib/daily';
import { toggleStoreDaily, toggleHideMessage } from './actions';

interface StoreRow {
  code: string;
  name: string;
  asm_owner: string | null;
  daily_message_enabled: boolean;
}

export function DailyAdminTable({
  stores,
  msgByCode,
}: {
  stores: StoreRow[];
  msgByCode: Record<string, SpDailyMessage>;
}) {
  const [scope, setScope] = useState<'enabled' | 'all'>('enabled');
  const [search, setSearch] = useState('');
  const [asm, setAsm] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<SpDailyMessage | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const asms = [...new Set(stores.map(s => s.asm_owner).filter(Boolean) as string[])].sort();

  let list = stores;
  if (scope === 'enabled') list = list.filter(s => s.daily_message_enabled);
  if (asm) list = list.filter(s => s.asm_owner === asm);
  if (status) list = list.filter(s => msgByCode[s.code]?.status === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }

  const flipStore = (code: string, next: boolean) => {
    setError('');
    startTransition(async () => {
      const res = await toggleStoreDaily(code, next);
      if (res && 'error' in res && res.error) setError(res.error);
      router.refresh();
    });
  };

  const flipHide = (id: number, next: boolean) => {
    setError('');
    startTransition(async () => {
      const res = await toggleHideMessage(id, next);
      if (res && 'error' in res && res.error) setError(res.error);
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setScope('enabled')}
            className={`text-sm px-3 py-1 rounded ${scope === 'enabled' ? 'bg-white shadow font-medium' : 'text-slate-600'}`}
          >
            Enabled only
          </button>
          <button
            onClick={() => setScope('all')}
            className={`text-sm px-3 py-1 rounded ${scope === 'all' ? 'bg-white shadow font-medium' : 'text-slate-600'}`}
          >
            All stores
          </button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search store / code"
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm min-w-[200px] outline-none focus:ring-2 focus:ring-red-500"
        />
        <select
          value={asm}
          onChange={e => setAsm(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All ASMs</option>
          {asms.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All statuses</option>
          {['Good', 'Average', 'Low', 'No Sales', 'Exception', 'No History'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{list.length} stores</span>
      </div>

      {error && <div className="mx-5 mt-3 text-rose-600 text-sm bg-rose-50 p-2 rounded">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Store</th>
              <th className="text-left px-4 py-3">ASM</th>
              <th className="text-left px-4 py-3">Enabled</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Top lever</th>
              <th className="text-left px-4 py-3">Opportunity</th>
              <th className="text-left px-4 py-3">Viewed</th>
              <th className="text-left px-4 py-3">Hide</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(s => {
              const m = msgByCode[s.code];
              return (
                <tr key={s.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {m ? (
                      <button onClick={() => setOpen(m)} className="font-medium text-slate-900 hover:text-red-700 text-left">
                        {s.name}
                      </button>
                    ) : (
                      <span className="font-medium text-slate-900">{s.name}</span>
                    )}
                    {m?.review_flag ? <div className="text-xs text-amber-600">⚠ {m.review_flag}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.asm_owner ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => flipStore(s.code, !s.daily_message_enabled)}
                      disabled={isPending}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        s.daily_message_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {s.daily_message_enabled ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-3">{m ? `${dailyStatusEmoji(m.status)} ${m.status}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{m?.top_lever ?? '—'}</td>
                  <td className="px-4 py-3">{m ? rupees(m.total_opportunity) : '—'}</td>
                  <td className="px-4 py-3">{m ? (m.first_viewed_at ? '✓' : '✗') : '—'}</td>
                  <td className="px-4 py-3">
                    {m ? (
                      <input
                        type="checkbox"
                        checked={m.is_hidden}
                        onChange={e => flipHide(m.id, e.target.checked)}
                        disabled={isPending}
                      />
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  No stores match. Switch to &quot;All stores&quot; to enable the feature for a store.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-900">{open.store_name}</div>
              <button onClick={() => setOpen(null)} className="text-slate-500 hover:text-slate-900 text-sm">Close</button>
            </div>
            <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{open.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}