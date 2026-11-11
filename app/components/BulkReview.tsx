// app/components/BulkReview.tsx   (used by both Admin and Agent review pages)
'use client';

import { useState, useTransition } from 'react';
import { Check, X, PackageCheck } from 'lucide-react';
import { updateBulkStatus } from '@/app/sp/bulk/actions';
import { formatDeliveryDate, type BulkOrder } from '@/lib/bulk';

const statusColor: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-blue-100 text-blue-700',
  Added: 'bg-green-100 text-green-700',
  Rejected: 'bg-rose-100 text-rose-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

export function BulkReview({ orders }: { orders: BulkOrder[] }) {
  const [rows, setRows] = useState(orders);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  function act(id: number, status: 'Approved' | 'Rejected' | 'Added') {
    setBusyId(id);
    start(async () => {
      const res = await updateBulkStatus(id, status);
      if (!res.error) setRows(rs => rs.map(r => (r.id === id ? { ...r, status } : r)));
      setBusyId(null);
    });
  }

  if (rows.length === 0) {
    return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">No bulk orders yet.</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map(o => (
        <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-slate-500">{o.order_code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
              </div>
              <div className="font-semibold text-slate-900 mt-1">{o.store_name}</div>
              <div className="text-sm text-slate-500">
                Delivery {formatDeliveryDate(o.delivery_date)} · {o.line_count} items · {o.total_qty} qty
              </div>
            </div>
            {o.status === 'Pending' && (
              <div className="flex gap-2">
                <button disabled={pending && busyId === o.id} onClick={() => act(o.id, 'Approved')}
                  className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Check size={14} /> Approve
                </button>
                <button disabled={pending && busyId === o.id} onClick={() => act(o.id, 'Rejected')}
                  className="flex items-center gap-1 bg-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-rose-700 disabled:opacity-50">
                  <X size={14} /> Reject
                </button>
              </div>
            )}
            {o.status === 'Approved' && (
              <button disabled={pending && busyId === o.id} onClick={() => act(o.id, 'Added')}
                className="flex items-center gap-1 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                <PackageCheck size={14} /> Mark added to cart
              </button>
            )}
          </div>

          {/* line items */}
          <div className="mt-3 border-t border-slate-100 pt-2">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {(o.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="py-1 text-slate-700">{it.name}</td>
                    <td className="py-1 text-slate-400 text-xs">{it.alias}</td>
                    <td className="py-1 text-right font-medium text-slate-800">× {it.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}