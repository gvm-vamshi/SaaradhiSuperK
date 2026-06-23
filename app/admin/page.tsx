import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { AdminTabs } from './AdminTabs';
import { Shield, Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2, Store, MessageCircle } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type StoreStats, type TicketMessage } from '@/lib/types';

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
    supabase.from('tickets').select('*, stores(name)').order('created_at', { ascending: false }),
    supabase.from('v_store_stats').select('*'),
  ]);

  const tickets = (ticketsRes.data || []) as (Ticket & { stores: { name: string } | null })[];
  const storeStats = (statsRes.data || []) as StoreStats[];

  const all = tickets;
  const stats = storeStats;

  // Fetch last message per ticket for "awaiting response"
  const pendingIds = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').map(t => t.id);
  let lastMessages: Record<number, TicketMessage> = {};
  if (pendingIds.length > 0) {
    const { data: msgs } = await supabase
      .from('ticket_messages')
      .select('*')
      .in('ticket_id', pendingIds)
      .order('created_at', { ascending: false }) as unknown as { data: TicketMessage[] };

    for (const m of (msgs || [])) {
      if (!lastMessages[m.ticket_id]) {
        lastMessages[m.ticket_id] = m;
      }
    }
  }

  const needsResponse = (t: Ticket) => {
    if (t.status === 'Resolved' || t.status === 'Closed') return false;
    const last = lastMessages[t.id];
    if (!last) return true;
    return last.sender_role === 'sp';
  };

  const now = Date.now();
  const hrs48 = 48 * 60 * 60 * 1000;
  const days7 = 7 * 24 * 60 * 60 * 1000;

  const totalTickets = all.length;
  const open = all.filter(t => t.status === 'Open').length;
  const inProg = all.filter(t => t.status === 'In Progress').length;
  const resolved = all.filter(t => t.status === 'Resolved').length;
  const storesWithPending = stats.filter(x => Number(x.pending_count) > 0).length;
  const awaitingCount = all.filter(t => needsResponse(t)).length;

  // SLA calculations
  const pendingTickets = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

  const sla1Breaches = pendingTickets.filter(t =>
    !t.first_response_at && (now - new Date(t.created_at).getTime()) > hrs48
  );

  const sla2Breaches = pendingTickets.filter(t =>
    (now - new Date(t.created_at).getTime()) > days7
  );

  const agingMap: Record<string, Ticket[]> = { '< 24 hrs': [], '1-3 days': [], '3-7 days': [], '> 7 days': [] };
  for (const t of pendingTickets) agingMap[agingBucket(t.created_at)].push(t);

  const byCategory: Record<string, number> = {};
  for (const t of all) byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  const byCategorySorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  for (const t of all) byPriority[t.priority]++;

  const topByPending = [...stats].sort((a, b) => Number(b.pending_count) - Number(a.pending_count)).slice(0, 5);

  const ticketAge = (t: Ticket) => {
    const diff = now - new Date(t.created_at).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return days > 0 ? `${days}d` : `${hours}h`;
  };

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <div className="space-y-6">
        <div className="grid md:grid-cols-6 gap-4">
          <KpiCard icon={<MessageCircle className="text-rose-600"/>} label="Awaiting Response" value={awaitingCount} />
          <KpiCard icon={<TicketIcon className="text-slate-700"/>} label="Total tickets" value={totalTickets} />
          <KpiCard icon={<AlertTriangle className="text-blue-600"/>} label="Open" value={open} />
          <KpiCard icon={<Clock className="text-violet-600"/>} label="In progress" value={inProg} />
          <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>} label="Resolved" value={resolved} />
          <KpiCard icon={<Store className="text-orange-600"/>} label="Stores with pending" value={`${storesWithPending} / ${stats.length}`} />
        </div>

        {/* SLA Breaches */}
        {(sla1Breaches.length > 0 || sla2Breaches.length > 0) && (
          <div className="bg-rose-50 rounded-xl border-2 border-rose-300 p-6">
            <div className="font-bold text-rose-900 text-lg mb-4">🚨 SLA Breaches</div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className={`p-4 rounded-lg border-2 ${sla1Breaches.length > 0 ? 'border-rose-400 bg-white' : 'border-emerald-300 bg-emerald-50'}`}>
                <div className="text-xs font-semibold uppercase text-slate-500">SLA 1: First Response within 48 hrs</div>
                <div className={`text-3xl font-bold mt-1 ${sla1Breaches.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {sla1Breaches.length > 0 ? `${sla1Breaches.length} breached` : '✓ On track'}
                </div>
              </div>
              <div className={`p-4 rounded-lg border-2 ${sla2Breaches.length > 0 ? 'border-rose-400 bg-white' : 'border-emerald-300 bg-emerald-50'}`}>
                <div className="text-xs font-semibold uppercase text-slate-500">SLA 2: Resolution within 7 days</div>
                <div className={`text-3xl font-bold mt-1 ${sla2Breaches.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {sla2Breaches.length > 0 ? `${sla2Breaches.length} breached` : '✓ On track'}
                </div>
              </div>
            </div>

            {sla1Breaches.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-semibold text-rose-800 mb-2">⏱ No first response in 48+ hrs</div>
                <div className="space-y-1">
                  {sla1Breaches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(t => (
                    <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-rose-100 text-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                        <span className="text-slate-900 font-medium truncate">{t.stores?.name}</span>
                        <span className="text-xs text-slate-500">{t.category} → {t.sub_category}</span>
                      </div>
                      <span className="text-xs font-semibold text-rose-700 flex-shrink-0">⏱ {ticketAge(t)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {sla2Breaches.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-rose-800 mb-2">📅 Not resolved in 7+ days</div>
                <div className="space-y-1">
                  {sla2Breaches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(t => (
                    <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-rose-100 text-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                        <span className="text-slate-900 font-medium truncate">{t.stores?.name}</span>
                        <span className="text-xs text-slate-500">{t.category} → {t.sub_category}</span>
                      </div>
                      <span className="text-xs font-semibold text-rose-700 flex-shrink-0">⏱ {ticketAge(t)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Awaiting response */}
        {awaitingCount > 0 && (
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-6">
            <div className="font-semibold text-rose-900 mb-4">💬 Tickets awaiting response ({awaitingCount})</div>
            <div className="space-y-2">
              {all.filter(t => needsResponse(t)).slice(0, 10).map(t => {
                const lastMsg = lastMessages[t.id];
                const lastMsgPreview = lastMsg ? lastMsg.body.slice(0, 80) + (lastMsg.body.length > 80 ? '...' : '') : 'No messages yet';
                return (
                  <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-rose-100 bg-white border border-rose-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                        <span className="text-xs text-slate-500">· {t.stores?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agingColors[agingBucket(t.created_at)]}`}>⏱ {ticketAge(t)}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 mt-0.5">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                      {lastMsg?.sender_role === 'sp' && (
                        <div className="text-xs text-rose-700 mt-0.5">💬 SP: {lastMsgPreview}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
              {awaitingCount > 10 && (
                <Link href="/admin/tickets" className="text-sm text-rose-700 hover:underline">View all {awaitingCount} awaiting tickets →</Link>
              )}
            </div>
          </div>
        )}

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
                .map(t => (
                  <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className="text-sm font-medium text-slate-900 truncate">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</span>
                      <span className="text-xs text-slate-500 hidden md:inline">· {t.stores?.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${agingColors[agingBucket(t.created_at)]}`}>⏱ {ticketAge(t)}</span>
                  </Link>
                ))}
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