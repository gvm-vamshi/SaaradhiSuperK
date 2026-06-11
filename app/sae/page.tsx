import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { User, Ticket as TicketIcon, Clock, CheckCircle2, Phone } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SaeHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single() as unknown as { data: Profile };

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, stores(name, phone)')
    .order('created_at', { ascending: false }) as unknown as { data: (Ticket & { stores: { name: string; phone: string | null } | null })[] };

  const all = tickets || [];
  const open = all.filter(t => t.status === 'Open').length;
  const inProgress = all.filter(t => t.status === 'In Progress').length;
  const resolved = all.filter(t => t.status === 'Resolved').length;

  return (
    <Shell title="SAE Console" subtitle={profile.full_name} icon={<User size={20}/>} accent="slate">
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          <KpiCard icon={<TicketIcon className="text-slate-700"/>} label="Total tickets" value={all.length} />
          <KpiCard icon={<Clock className="text-orange-600"/>} label="Open" value={open} />
          <KpiCard icon={<Clock className="text-violet-600"/>} label="In Progress" value={inProgress} />
          <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>} label="Resolved" value={resolved} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold">My stores&apos; tickets ({all.length})</div>
          <div className="divide-y divide-slate-100">
            {all.map(t => (
              <Link key={t.id} href={`/sae/tickets/${t.id}`} className="block px-6 py-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                      <span className="text-xs text-slate-500">· {t.stores?.name}</span>
                    </div>
                    <div className="font-medium text-slate-900">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                    <div className="text-sm text-slate-500 truncate">{t.description}</div>
                  </div>
                  {t.stores?.phone && (
                    <a href={`tel:${t.stores.phone}`}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium px-3 py-1.5 rounded-lg">
                      <Phone size={12}/> {t.stores.phone}
                    </a>
                  )}
                </div>
              </Link>
            ))}
            {all.length === 0 && <div className="p-8 text-center text-slate-500">No tickets from your assigned stores.</div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}