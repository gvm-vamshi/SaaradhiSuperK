// app/sp/bulk/BulkOrderForm.tsx
'use client';

import { useState, useTransition, useRef } from 'react';
import { Search, Plus, Trash2, PackageCheck, CheckCircle2 } from 'lucide-react';
import { searchSku, submitBulkOrder } from './actions';
import { formatDeliveryDate, type SkuHit, type CartItem, type BulkOrder } from '@/lib/bulk';

const statusColor: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Added: 'bg-green-100 text-green-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

export function BulkOrderForm({
  storeName,
  openDates,
  hasSchedule,
  recent,
}: {
  storeName: string;
  openDates: string[];
  hasSchedule: boolean;
  recent: BulkOrder[];
}) {
  const [date, setDate] = useState(openDates[0] || '');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SkuHit[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [searching, startSearch] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [done, setDone] = useState<{ code: string; date: string } | null>(null);
  const [err, setErr] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartItems = Object.values(cart);
  const totalQty = cartItems.reduce((a, i) => a + (Number(i.qty) || 0), 0);

  function onSearch(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(() => {
      startSearch(async () => setResults(await searchSku(v)));
    }, 250);
  }

  function addItem(s: SkuHit) {
    setCart(c => ({ ...c, [s.id]: c[s.id] ? c[s.id] : { ...s, qty: 1 } }));
  }
  function setQty(id: string, qty: number) {
    setCart(c => ({ ...c, [id]: { ...c[id], qty: Math.max(0, qty) } }));
  }
  function remove(id: string) {
    setCart(c => { const n = { ...c }; delete n[id]; return n; });
  }

  function submit() {
    setErr('');
    const items = cartItems.filter(i => (Number(i.qty) || 0) > 0);
    if (!date) return setErr('Select a delivery date.');
    if (!items.length) return setErr('Add at least one SKU with a quantity.');
    startSubmit(async () => {
      const res = await submitBulkOrder({ items, deliveryDate: date });
      if (res.error) setErr(res.error);
      else { setDone({ code: res.orderCode!, date: res.deliveryDate! }); setCart({}); setResults([]); setQ(''); }
    });
  }

  // --- No schedule / no open date states ---
  if (!hasSchedule) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800">
        బల్క్ ఆర్డర్ మీ store కి ఇప్పుడు అందుబాటులో లేదు. (No upcoming delivery schedule found for your store. Please contact your SAE.)
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <CheckCircle2 className="mx-auto text-green-600 mb-2" size={40} />
        <div className="text-lg font-bold text-green-800">ఆర్డర్ పంపబడింది! · Order submitted</div>
        <div className="text-sm text-green-700 mt-1">
          {done.code} · delivery {formatDeliveryDate(done.date)}
        </div>
        <div className="text-sm text-slate-600 mt-2">మా team review చేసి cart లో add చేస్తారు.</div>
        <button onClick={() => setDone(null)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">
          కొత్త ఆర్డర్ · New order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delivery date */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-700 mb-2">డెలివరీ తేదీ · Delivery date</div>
        {openDates.length === 0 ? (
          <div className="text-sm text-rose-600">
            ఇప్పుడు ఏ delivery కి order చేయడానికి time ముగిసింది (cutoff: delivery కి ముందు రోజు 10 AM). తర్వాతి delivery కోసం మళ్ళీ try చేయండి.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {openDates.map(d => (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  date === d ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {formatDeliveryDate(d)}
              </button>
            ))}
          </div>
        )}
        <div className="text-xs text-slate-400 mt-2">Cutoff: 10 AM the day before each delivery date.</div>
      </div>

      {openDates.length > 0 && (
        <>
          {/* SKU search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                value={q}
                onChange={e => onSearch(e.target.value)}
                placeholder="SKU వెతకండి · search product name…"
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {searching && <div className="text-xs text-slate-400 mt-2">వెతుకుతోంది…</div>}
            {results.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {results.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-800 truncate">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.alias} · ₹{s.sp}</div>
                    </div>
                    <button
                      onClick={() => addItem(s)}
                      className="flex-shrink-0 ml-3 flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-700 mb-2">
              మీ ఆర్డర్ · Your order ({cartItems.length} items · {totalQty} qty)
            </div>
            {cartItems.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center">SKU లు add చేయండి.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map(it => (
                  <div key={it.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 truncate">{it.name}</div>
                      <div className="text-xs text-slate-400">{it.alias}</div>
                    </div>
                    <input
                      type="number" min={1} value={it.qty}
                      onChange={e => setQty(it.id, parseInt(e.target.value || '0', 10))}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center"
                    />
                    <button onClick={() => remove(it.id)} className="text-slate-400 hover:text-rose-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2">{err}</div>}

          <button
            onClick={submit}
            disabled={submitting || cartItems.length === 0}
            className="w-full bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <PackageCheck size={18} /> {submitting ? 'పంపుతోంది…' : 'ఆర్డర్ పంపండి · Submit order'}
          </button>
        </>
      )}

      {/* Recent orders */}
      {recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">ఇటీవలి ఆర్డర్లు · Recent</div>
          <div className="divide-y divide-slate-100">
            {recent.map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-mono text-xs text-slate-500">{o.order_code}</span>
                  <span className="text-slate-600"> · {formatDeliveryDate(o.delivery_date)} · {o.line_count} items</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}