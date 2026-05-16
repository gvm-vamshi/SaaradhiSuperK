import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { User, Plus, Ticket as TicketIcon, MessageSquare, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type Profile, type Store } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SpHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, stores(*)')
    .eq('id', user!.id)
    .single() as unknown as { data: Profile & { stores: Store | null } };

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('sp_id', user!.id)
    .order('created_at', { ascending: false }) as unknown as { data: Ticket[] };

  const all = tickets || [];
  const openCount = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const resolved  = all.filter(t => t.status === 'Resolved').length;

  return (
    <Shell
      title="Store Partner"
      subtitle={`${profile.full_name} · ${profile.stores?.name ?? ''}`}
      icon={<User size={20}/>}
      accent="red"
    >
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-white">
          <div className="text-sm opacity-90">Hello · నమస్కారం,</div>
          <div className="text-3xl font-bold">{profile.full_name} 👋</div>
          <div className="opacity-90 mt-1">{profile.stores?.name} · {profile.store_code}</div>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/sp/tickets/new" className="bg-white text-red-700 font-semibold px-5 py-3 rounded-lg hover:bg-red-50 flex items-center gap-2"><Plus size={18}/> Raise a query · ప్రశ్న లేవనెత్తండి</Link>
            <Link href="/sp/tickets" className="bg-white/15 backdrop-blur text-white border border-white/30 font-semibold px-5 py-3 rounded-lg hover:bg-white/25 flex items-center gap-2"><TicketIcon size={18}/> My tickets · నా టికెట్‌లు ({all.length})</Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <KpiCardBi icon={<MessageSquare className="text-red-600"/>}   en="Total queries raised" te="లేవనెత్తిన మొత్తం ప్రశ్నలు" value={all.length}/>
          <KpiCardBi icon={<Clock        className="text-orange-600"/>} en="Currently open"        te="ప్రస్తుతం తెరిచినవి"        value={openCount}/>
          <KpiCardBi icon={<CheckCircle2 className="text-blue-600"/>}   en="Resolved"               te="పరిష్కరించబడినవి"           value={resolved}/>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Recent tickets</div>
              <div className="text-xs text-slate-500">ఇటీవలి టికెట్‌లు</div>
            </div>
            <Link href="/sp/tickets" className="text-sm text-red-600 hover:underline">View all · అన్నీ చూడండి →</Link>
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
              <div className="p-6 text-center text-slate-500">
                No tickets yet. Click &quot;Raise a query&quot; to start.
                <div className="text-sm mt-1">ఇంకా టికెట్‌లు లేవు. ప్రారంభించడానికి &quot;ప్రశ్న లేవనెత్తండి&quot; క్లిక్ చేయండి.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function KpiCardBi({ icon, en, te, value }: { icon: React.ReactNode; en: string; te: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{en}</div>
          <div className="text-xs text-slate-400">{te}</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}