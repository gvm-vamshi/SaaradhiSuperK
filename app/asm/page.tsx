import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { Shield, Ticket as TicketIcon, Clock, CheckCircle2, Store, Phone } from 'lucide-react';
import { priorityColor, statusColor, formatDate, type Ticket, type Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

function agingBucket(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days <= 1) return '< 24 hrs';
  if (days <= 3) return '1-3 days';
  if (days <= 7) return '3-7 days';
  return '> 7 days';
}

const agingColors: Record<string, string> = {
  '< 24 hrs': 'bg-blue-100 text-blue-700 border-blue-300',
  '1-3 days': 'bg-amber-100 text-amber-700 border-amber-300',
  '3-7 days': 'bg-orange-100 text-orange-700 border-orange-300',
  '> 7 days': 'bg-rose-100 text-rose-700 border-rose-300',
};

export default async function AsmHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single() as unknown as { data: Profile };

  // RLS filters to only this ASM's stores
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, stores(name, phone)')
    .order('created_at', { ascending: false }) as unknown as { data: (Ticket & { stores: { name: string; phone: string | null } | null })[] };

  const all = tickets || [];
  const open = all.filter(t => t.status === 'Open');
  const inProgress = all.filter(t => t.status === 'In Progress');
  const resolved = all.filter(t => t.status === 'Resolved');
  const pending = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

  const agingMap: Record<string, number> = { '< 24 hrs': 0, '1-3 days': 0, '3-7 days': 0, '> 7 days': 0 };
  for (const t of pending) agingMap[agingBucket(t.created_at)]++;

  return (
    <Shell title="Area Manager" subtitle={profile.full_name} icon={<Shield size={20}/>} accent="slate">
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          <KpiCard icon={<TicketIcon className="text-slate-700"/>} label="Total tickets" value={all.length} />
          <KpiCard icon={<Clock className="text-orange-600"/>} label="Open" value={open.length} />
          <KpiCard icon={<Clock className="text-violet-600"/>} label="In Progress" value={inProgress.length} />
          <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>} label="Resolved" value={resolved.length} />
        </div>

        {/* Aging */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="font-semibold mb-4">Pending tickets by age</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(agingMap).map(([bucket, count]) => (
              <div key={bucket} className={`p-4 rounded-lg border ${agingColors[bucket]}`}>
                <div className="text-xs font-semibold">{bucket}</div>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket list */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold">
            My stores&apos; tickets ({all.length})
          </div>
          <div className="divide-y divide-slate-100">
            {all.map(t => {
              const isPending = t.status !== 'Resolved' && t.status !== 'Closed';
              const diff = Date.now() - new Date(t.created_at).getTime();
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const age = days > 0 ? `${days}d` : `${hours}h`;
              return (
                <Link key={t.id} href={`/asm/tickets/${t.id}`} className="block px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                        {isPending && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agingColors[agingBucket(t.created_at)]}`}>⏱ {age}</span>
                        )}
                        <span className="text-xs text-slate-500">· {t.stores?.name}</span>
                      </div>
                      <div className="font-medium text-slate-900">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                      <div className="text-sm text-slate-500 truncate">{t.description}</div>
                    </div>
                    {t.stores?.phone && (
                      <a href={`tel:${t.stores.phone}`} onClick={e => e.stopPropagation()}
                        className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium px-3 py-1.5 rounded-lg">
                        <Phone size={12}/> {t.stores.phone}
                      </a>
                    )}
                  </div>
                </Link>
              );
            })}
            {all.length === 0 && <div className="p-8 text-center text-slate-500">No tickets from your stores.</div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}