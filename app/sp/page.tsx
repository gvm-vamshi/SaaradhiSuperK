import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { User, Plus, Ticket as TicketIcon, MessageSquare, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type Profile, type Store } from '@/lib/types';

export const dynamic = 'force-dynamic'; // always fetch fresh

export default async function SpHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, stores(*)')
    .eq('id', user!.id)
    .single() as { data: Profile & { stores: Store | null } };

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('sp_id', user!.id)
    .order('created_at', { ascending: false }) as { data: Ticket[] };

  const all = tickets || [];
  const openCount = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const resolved  = all.filter(t => t.status === 'Resolved').length;

  return (
    <Shell
      title="Store Partner"
      subtitle={`${profile.full_name} · ${profile.stores?.name ?? ''}`}
      icon={<User size={20}/>}
      accent="emerald"
    >
      <div className="space-y-6">
        {/* Hero banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
          <div className="text-sm opacity-90">Hello,</div>
          <div className="text-3xl font-bold">{profile.full_name.split(' ')[0]} 👋</div>
          <div className="opacity-90 mt-1">{profile.stores?.name} · {profile.store_code}</div>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/sp/tickets/new" className="bg-white text-emerald-700 font-semibold px-5 py-3 rounded-lg hover:bg-emerald-50 flex items-center gap-2"><Plus size={18}/> Raise a query</Link>
            <Link href="/sp/tickets" className="bg-white/15 backdrop-blur text-white border border-white/30 font-semibold px-5 py-3 rounded-lg hover:bg-white/25 flex items-center gap-2"><TicketIcon size={18}/> My tickets ({all.length})</Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <KpiCard icon={<MessageSquare className="text-emerald-600"/>} label="Total queries raised" value={all.length}/>
          <KpiCard icon={<Clock         className="text-orange-600"/>}  label="Currently open"       value={openCount}/>
          <KpiCard icon={<CheckCircle2  className="text-blue-600"/>}    label="Resolved"             value={resolved}/>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-slate-900">Recent tickets</div>
            <Link href="/sp/tickets" className="text-sm text-emerald-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {all.slice(0, 4).map(t => (
              <Link key={t.id} href={`/sp/tickets/${t.id}`} className="block px-6 py-4 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                    </div>
                    <div className="font-medium text-slate-900 truncate">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                    <div className="text-sm text-slate-500 truncate">{t.description}</div>
                  </div>
                  <ChevronRight className="text-slate-400 flex-shrink-0 ml-4" size={20}/>
                </div>
              </Link>
            ))}
            {all.length === 0 && (
              <div className="p-6 text-center text-slate-500">No tickets yet. Click &quot;Raise a query&quot; to start.</div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
