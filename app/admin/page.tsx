import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { AdminTabs } from './AdminTabs';
import { Shield, Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2, Store } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type StoreStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

function agingBucket(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 1) return '< 24 hrs';
  if (days <= 3) return '1-3 days';
  if (days <= 7) return '3-7 days';
  return '> 7 days';
}

const agingOrder = ['< 24 hrs', '1-3 days', '3-7 days', '> 7 days'];
const agingColors: Record<string, string> = {
  '< 24 hrs': 'bg-blue-100 text-blue-700 border-blue-300',
  '1-3 days': 'bg-amber-100 text-amber-700 border-amber-300',
  '3-7 days': 'bg-orange-100 text-orange-700 border-orange-300',
  '> 7 days': 'bg-rose-100 text-rose-700 border-rose-300',
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [ticketsRes, statsRes] = await Promise.all([
    supabase.from('tickets').select('*, stores(name)').order('created_at', { ascending: false }).limit(20),
    supabase.from('v_store_stats').select('*'),
  ]);

  const tickets = (ticketsRes.data || []) as (Ticket & { stores: { name: string } | null })[];
  const storeStats = (statsRes.data || []) as StoreStats[];

  const all = tickets;
  const stats = storeStats;

  const totalTickets = stats.reduce((s, x) => s + Number(x.total_tickets || 0), 0);
  const open         = stats.reduce((s, x) => s + Number(x.open_count || 0), 0);
  const inProg       = stats.reduce((s, x) => s + Number(x.in_progress_count || 0), 0);
  const resolved     = stats.reduce((s, x) => s + Number(x.resolved_count || 0), 0);
  const storesWithPending = stats.filter(x => Number(x.pending_count) > 0).length;

  // Aging breakdown — only pending tickets
  const pendingTickets = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const agingMap: Record<string, Ticket[]> = { '< 24 hrs': [], '1-3 days': [], '3-7 days': [], '> 7 days': [] };
  for (const t of pendingTickets) {
    const bucket = agingBucket(t.created_at);
    agingMap[bucket].push(t);
  }

  const byCategory: Record<string, number> = {};
  for (const t of all) byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  const byCategorySorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  for (const t of all) byPriority[t.priority]++;

  const topByPending = [...stats].sort((a, b) => Number(b.pending_count) - Number(a.pending_count)).slice(0, 5);

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <div className="space-y-6">
        <div className="grid md:grid-cols-5 gap-4">
          <KpiCard icon={<TicketIcon className="text-slate-700"/>}     label="Total tickets"        value={totalTickets} />
          <KpiCard icon={<AlertTriangle className="text-blue-600"/>}    label="Open"                 value={open} />
          <KpiCard icon={<Clock className="text-violet-600"/>}          label="In progress"          value={inProg} />
          <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>}  label="Resolved"             value={resolved} />
          <KpiCard icon={<Store className="text-orange-600"/>}          label="Stores with pending"  value={`${storesWithPending} / ${stats.length}`} />
        </div>

        {/* Aging breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="font-semibold mb-4">Pending tickets by age</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {agingOrder.map(bucket => (
              <div key={bucket} className={`p-4 rounded-lg border ${agingColors[bucket]}`}>
                <div className="text-xs font-semibold">{bucket}</div>
                <div className="text-2xl font-bold mt-1">{agingMap[bucket].length}</div>
              </div>
            ))}
          </div>
          {pendingTickets.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-xs font-semibold text-slate-500 uppercase">Oldest pending tickets</div>
              {[...pendingTickets]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .slice(0, 5)
                .map(t => {
                  const diff = Date.now() - new Date(t.created_at).getTime();
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const age = days > 0 ? `${days}d ago` : `${hours}h ago`;
                  return (
                    <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                        <span className="text-sm font-medium text-slate-900 truncate">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</span>
                        <span className="text-xs text-slate-500 hidden md:inline">· {t.stores?.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${agingColors[agingBucket(t.created_at)]}`}>⏱ {age}</span>
                    </Link>
                  );
                })}
            </div>
          )}
          {pendingTickets.length === 0 && (
            <div className="text-sm text-emerald-600 text-center py-2">✓ No pending tickets — all clear!</div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="font-semibold mb-4">Tickets by category</div>
            <div className="space-y-3">
              {byCategorySorted.map(([cat, n]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-700">{cat}</span><span className="font-medium">{n}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(n / (all.length || 1)) * 100}%` }}/>
                  </div>
                </div>
              ))}
              {byCategorySorted.length === 0 && <div className="text-sm text-slate-500">No tickets yet.</div>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="font-semibold mb-4">Tickets by priority</div>
            <div className="grid grid-cols-2 gap-3">
              {(['Critical','High','Medium','Low'] as const).map(p => (
                <div key={p} className={`p-4 rounded-lg border ${priorityColor(p)}`}>
                  <div className="text-xs font-semibold">{p}</div>
                  <div className="text-2xl font-bold mt-1">{byPriority[p]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Top stores by pending tickets</div>
            <Link href="/admin/stores" className="text-xs text-red-600 hover:underline">View all stores →</Link>
          </div>
          <div className="space-y-2">
            {topByPending.map(s => (
              <Link key={s.code} href={`/admin/stores/${s.code}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Store size={16} className="text-slate-400 flex-shrink-0"/>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.code} · {s.city}</div>
                  </div>
                </div>
                {Number(s.pending_count) > 0 ? (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0">{s.pending_count} pending</span>
                ) : (
                  <span className="text-emerald-600 text-xs flex-shrink-0">✓ Clear</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="font-semibold mb-4">Recent activity</div>
          <div className="space-y-3">
            {all.slice(0, 5).map(t => (
              <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                  <span className="text-sm font-medium truncate">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</span>
                  <span className="text-xs text-slate-500 hidden md:inline">{t.stores?.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
              </Link>
            ))}
            {all.length === 0 && <div className="text-sm text-slate-500">No activity yet.</div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}