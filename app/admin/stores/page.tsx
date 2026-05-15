import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield, Store as StoreIcon, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import type { StoreStats } from '@/lib/types';
import { StoreFilter } from './StoreFilter';

export const dynamic = 'force-dynamic';

export default async function AdminStores({ searchParams }: { searchParams: Promise<{ filter?: string; sort?: string }> }) {
  const { filter = 'all', sort = 'pending' } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('v_store_stats').select('*') as unknown as { data: StoreStats[] };
  const stats = data || [];

  const totalPending      = stats.reduce((s, x) => s + Number(x.pending_count || 0), 0);
  const storesWithPending = stats.filter(x => Number(x.pending_count) > 0).length;
  const storesWithCritical= stats.filter(x => Number(x.critical_pending) > 0).length;

  let list = stats;
  if (filter === 'with_pending') list = stats.filter(s => Number(s.pending_count) > 0);
  if (filter === 'no_pending')   list = stats.filter(s => Number(s.pending_count) === 0);
  list = [...list].sort((a, b) => Number(b[sort as keyof StoreStats] || 0) - Number(a[sort as keyof StoreStats] || 0));

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          <KpiCard icon={<StoreIcon     className="text-slate-700"/>}  label="Total stores"           value={stats.length} />
          <KpiCard icon={<AlertTriangle className="text-orange-600"/>} label="Stores with pending"    value={`${storesWithPending} / ${stats.length}`} />
          <KpiCard icon={<Clock         className="text-blue-600"/>}   label="Total pending tickets"  value={totalPending} />
          <KpiCard icon={<AlertTriangle className="text-rose-600"/>}   label="Stores with critical"   value={storesWithCritical} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="font-semibold">Store-level view</div>
            <StoreFilter filter={filter} sort={sort}/>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="text-left  px-6 py-3">Store</th>
                  <th className="text-left  px-4 py-3">Location</th>
                  <th className="text-left  px-4 py-3">ASM</th>
                  <th className="text-center px-4 py-3">Pending</th>
                  <th className="text-center px-4 py-3">Critical</th>
                  <th className="text-center px-4 py-3">High</th>
                  <th className="text-center px-4 py-3">Resolved</th>
                  <th className="text-right  px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(s => (
                  <tr key={s.code} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <Link href={`/admin/stores/${s.code}`} className="block">
                        <div className="font-medium text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{s.code} · {s.partner_name}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.city}<div className="text-xs text-slate-500">{s.region}</div></td>
                    <td className="px-4 py-3 text-slate-700">{s.asm_owner}</td>
                    <td className="px-4 py-3 text-center">
                      {Number(s.pending_count) > 0
                        ? <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold">{s.pending_count}</span>
                        : <span className="text-emerald-600 text-xs">✓ Clear</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {Number(s.critical_pending) > 0
                        ? <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-semibold">{s.critical_pending}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {Number(s.high_pending) > 0
                        ? <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">{s.high_pending}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{s.resolved_count}</td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/stores/${s.code}`}><ChevronRight className="inline text-slate-400" size={18}/></Link>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No stores match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}