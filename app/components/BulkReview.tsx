// app/components/BulkReview.tsx  (Admin + Agent)
'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { confirmBulkItems, updateBulkStatus } from '@/app/sp/bulk/actions';
import { formatDeliveryDate, type BulkOrder, type OrderItem } from '@/lib/bulk';

const statusColor: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Added: 'bg-green-100 text-green-700',
  Partial: 'bg-indigo-100 text-indigo-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

function rupee(n: number) {
  n = Math.round(n || 0);
  const s = String(Math.abs(n)); let a = s.slice(-3), b = s.slice(0, -3);
  if (b) a = ',' + a; b = b.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + (n < 0 ? '-' : '') + b + a;
}

function OrderCard({ order }: { order: BulkOrder }) {
  const [o, setO] = useState(order);
  const [checked, setChecked] = useState<Set<string>>(
    new Set((order.items || []).filter(i => i.confirmed !== false).map(i => i.id))
  );
  const [pending, start] = useTransition();

  const orderValue = (o.items || []).reduce((a, it) => a + (Number(it.sp) || 0) * (Number(it.qty) || 0), 0);
  const editable = o.status === 'Pending' || o.status === 'Approved' || o.status === 'Partial';

  function toggle(id: string) {
    setChecked(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function confirm() {
    start(async () => {
      const res = await confirmBulkItems(o.id, Array.from(checked));
      if (!res.error) setO(prev => ({
        ...prev,
        status: res.status!,
        items: (prev.items || []).map(it => ({ ...it, confirmed: checked.has(it.id) })),
      }));
    });
  }
  function reject() {
    start(async () => {
      const res = await updateBulkStatus(o.id, 'Rejected');
      if (!res.error) setO(prev => ({ ...prev, status: 'Rejected' }));
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-slate-500">{o.order_code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
            {!o.enriched && <span className="text-xs text-slate-400">· enriching…</span>}
          </div>
          <div className="font-semibold text-slate-900 mt-1">{o.store_name}</div>
          <div className="text-sm text-slate-500">
            Delivery {formatDeliveryDate(o.delivery_date)} · {o.line_count} SKUs · {o.total_qty} qty · {rupee(orderValue)}
          </div>
          {o.reason && <div className="text-sm text-slate-700 mt-1">📝 {o.reason}</div>}
        </div>
        {editable && (
          <div className="flex gap-2">
            <button disabled={pending} onClick={confirm}
              className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Check size={14} /> Confirm selected ({checked.size}/{o.items?.length || 0})
            </button>
            <button disabled={pending} onClick={reject}
              className="flex items-center gap-1 bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-700 disabled:opacity-50">
              <X size={14} /> Reject all
            </button>
          </div>
        )}
      </div>

      {/* line items with metrics */}
      <div className="mt-3 border-t border-slate-100 pt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="text-left py-1 pr-2">{editable ? '✓' : ''}</th>
              <th className="text-left py-1 pr-2">SKU</th>
              <th className="text-right py-1 px-2">Qty</th>
              <th className="text-right py-1 px-2">Value</th>
              <th className="text-right py-1 px-2">WH stock</th>
              <th className="text-right py-1 pl-2">Sold 30d (days)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(o.items || []).map((it: OrderItem) => {
              const oos = (it.wh_stock ?? -1) <= 0;
              return (
                <tr key={it.id}>
                  <td className="py-1 pr-2">
                    {editable && (
                      <input type="checkbox" checked={checked.has(it.id)} onChange={() => toggle(it.id)} />
                    )}
                  </td>
                  <td className="py-1 pr-2 text-slate-700">{it.name}</td>
                  <td className="py-1 px-2 text-right">{it.qty}</td>
                  <td className="py-1 px-2 text-right text-slate-600">{rupee((Number(it.sp) || 0) * (Number(it.qty) || 0))}</td>
                  <td className={`py-1 px-2 text-right ${oos ? 'text-rose-600' : 'text-slate-600'}`}>
                    {oos ? 'Not in WH' : it.wh_stock}
                  </td>
                  <td className="py-1 pl-2 text-right text-slate-600">
                    {it.sold_30d ?? '—'}{it.selling_days != null ? ` (${it.selling_days}d)` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable && (
          <div className="text-xs text-slate-400 mt-2">
            Untick SKUs you can’t fulfil, then “Confirm selected” → all ticked = <b>Added</b>, some = <b>Partial</b>, none = <b>Rejected</b>.
          </div>
        )}
      </div>
    </div>
  );
}

export function BulkReview({ orders }: { orders: BulkOrder[] }) {
  if (orders.length === 0) {
    return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">No bulk orders yet.</div>;
  }
  return (
    <div className="space-y-3">
      {orders.map(o => <OrderCard key={o.id} order={o} />)}
    </div>
  );
}