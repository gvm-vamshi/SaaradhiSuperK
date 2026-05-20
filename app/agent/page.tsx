import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { Headphones, Ticket as TicketIcon, Clock, TrendingUp, CheckCircle2, Phone } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AgentHome({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = 'mine' } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single() as unknown as { data: Profile };

  const { data: queue } = await supabase
    .from('tickets')
    .select('*, stores(name, phone)')
    .order('created_at', { ascending: false }) as unknown as { data: (Ticket & { stores: { name: string; phone: string | null } | null })[] };

  const all = queue || [];
  const mine = all.filter(t => t.assigned_to === user!.id);

  let list = all;
  if (filter === 'mine')  list = mine;
  if (filter === 'open')  list = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

  return (
    <Shell title="Agent Console" subtitle={`${profile.full_name} · ${profile.team ?? ''}`} icon={<Headphones size={20}/>} accent="violet">
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<TicketIcon className="text-violet-600"/>} label="Assigned to me" value={mine.length} />
        <KpiCard icon={<Clock      className="text-orange-600"/>}  label="Open in queue" value={all.filter(t => t.status === 'Open').length} />
        <KpiCard icon={<TrendingUp className="text-blue-600"/>}    label="In progress"    value={all.filter(t => t.status === 'In Progress').length} />
        <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>} label="Resolved"     value={all.filter(t => t.status === 'Resolved').length} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="font-semibold">Tickets — {profile.team}</div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[['mine','Mine'],['open','Open'],['all','All']].map(([k,l]) => (
              <Link key={k} href={`/agent?filter=${k}`}
                className={`text-sm px-3 py-1 rounded-md ${filter === k ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-600'}`}>
                {l}
              </Link>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {list.map(t => (
            <div key={t.id} className="px-6 py-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <Link href={`/agent/tickets/${t.id}`} className="flex-1 min-w-0 block">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                    <span className="text-xs text-slate-500">· {t.stores?.name}</span>
                  </div>
                  <div className="font-medium text-slate-900">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                  <div className="text-sm text-slate-500 truncate">{t.description}</div>
                </Link>
                {t.stores?.phone && (
                  <a href={`tel:${t.stores.phone}`}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium px-3 py-1.5 rounded-lg"
                    title={`Call ${t.stores.name}`}>
                    <Phone size={12}/> {t.stores.phone}
                  </a>
                )}
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="p-8 text-center text-slate-500">No tickets in this view.</div>}
        </div>
      </div>
    </Shell>
  );
}