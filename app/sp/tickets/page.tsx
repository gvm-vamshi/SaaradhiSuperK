import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { User, ChevronRight } from 'lucide-react';
import { priorityColor, statusColor, type Ticket } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SpTickets() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('sp_id', user!.id)
    .order('created_at', { ascending: false }) as unknown as { data: Ticket[] };

  const all = tickets || [];

  return (
    <Shell title="Store Partner" icon={<User size={20}/>} accent="red">
      <Link href="/sp" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Back</Link>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 font-semibold">My tickets ({all.length})</div>
        <div className="divide-y divide-slate-100">
          {all.map(t => (
            <Link key={t.id} href={`/sp/tickets/${t.id}`} className="block px-6 py-4 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                  <div className="font-medium text-slate-900">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                  <div className="text-sm text-slate-500 truncate">{t.description}</div>
                </div>
                <ChevronRight className="text-slate-400 flex-shrink-0 ml-4" size={20}/>
              </div>
            </Link>
          ))}
          {all.length === 0 && <div className="p-8 text-center text-slate-500">No tickets yet.</div>}
        </div>
      </div>
    </Shell>
  );
}