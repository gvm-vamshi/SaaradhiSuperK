// app/components/BulkStoreToggles.tsx
'use client';

import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';
import { setBulkEnabled } from '@/app/sp/bulk/actions';

type StoreRow = { code: string; name: string; bulk_order_enabled: boolean };

export function BulkStoreToggles({ stores }: { stores: StoreRow[] }) {
  const [rows, setRows] = useState(stores);
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const enabledCount = rows.filter(r => r.bulk_order_enabled).length;
  const filtered = q.trim()
    ? rows.filter(r => (r.name + ' ' + r.code).toLowerCase().includes(q.toLowerCase()))
    : rows;

  function toggle(code: string, next: boolean) {
    setBusy(code);
    setRows(rs => rs.map(r => (r.code === code ? { ...r, bulk_order_enabled: next } : r)));
    start(async () => {
      const res = await setBulkEnabled(code, next);
      if (res.error) setRows(rs => rs.map(r => (r.code === code ? { ...r, bulk_order_enabled: !next } : r))); // revert
      setBusy(null);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3">
        <span className="font-semibold text-slate-800">
          Eligible stores <span className="text-sm font-normal text-slate-500">({enabledCount} enabled)</span>
        </span>
        <span className="text-slate-400 text-sm">{open ? '▲ hide' : '▼ manage'}</span>
      </button>

      {open && (
        <div className="px-5 pb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search store…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {filtered.map(r => (
              <div key={r.code} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="text-sm text-slate-800 truncate">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.code}</div>
                </div>
                <button
                  disabled={pending && busy === r.code}
                  onClick={() => toggle(r.code, !r.bulk_order_enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${r.bulk_order_enabled ? 'bg-green-500' : 'bg-slate-300'} disabled:opacity-50`}
                  aria-label="toggle"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${r.bulk_order_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="py-4 text-center text-sm text-slate-400">No stores match.</div>}
          </div>
        </div>
      )}
    </div>
  );
}