import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { AdminTabs } from '../../AdminTabs';
import { Shield, MapPin, Phone, Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { priorityColor, statusColor, formatDate, type StoreStats, type Ticket } from '@/lib/types';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminStoreDrillDown({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from('v_store_stats').select('*').eq('code', code).maybeSingle() as unknown as { data: StoreStats | null };
  if (!s) notFound();

  const { data: tickets } = await supabase
    .from('tickets').select('*').eq('store_code', code).order('created_at', { ascending: false }) as unknown as { data: Ticket[] };

  const all = tickets || [];
  const pending  = all.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const resolved = all.filter(t => t.status === 'Resolved' || t.status === 'Closed');

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <Link href="/admin/stores" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Back to all stores</Link>

      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-slate-300 text-sm"><MapPin size={14}/> {s.city}, {s.state} · {s.region}</div>
            <div className="text-2xl font-bold mt-1">{s.name}</div>
            <div className="text-slate-300 text-sm mt-1">Store Code: <span className="font-mono">{s.code}</span> · Partner: {s.partner_name} · ASM: {s.asm_owner}</div>
            {s.phone && (
              <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 mt-3 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                <Phone size={14}/> {s.phone}
              </a>
            )}
          </div>
          <div className="flex gap-2">
            {Number(s.critical_pending) > 0 && <span className="bg-rose-500 text-white text-xs px-3 py-1.5 rounded-full font-medium">🔴 {s.critical_pending} Critical</span>}
            {Number(s.pending_count) > 0
              ? <span className="bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full font-medium">{s.pending_count} Pending</span>
              : <span className="bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-full font-medium">✓ All Clear</span>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<TicketIcon className="text-slate-700"/>}     label="Total tickets" value={s.total_tickets} />
        <KpiCard icon={<AlertTriangle className="text-blue-600"/>}   label="Open"          value={s.open_count} />
        <KpiCard icon={<Clock className="text-violet-600"/>}         label="In progress"   value={s.in_progress_count} />
        <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>} label="Resolved"      value={s.resolved_count} />
      </div>

      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold flex items-center gap-2">
            <Clock size={16} className="text-orange-600"/> Pending tickets ({pending.length})
          </div>
          <div className="divide-y divide-slate-100">
            {pending.map(t => (
              <Link key={t.id} href={`/admin/tickets`} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                  <div className="font-medium text-slate-900">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                  <div className="text-sm text-slate-500 truncate">{t.description}</div>
                </div>
                <div className="text-right text-xs text-slate-500 flex-shrink-0 ml-4">
                  <div>{formatDate(t.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600"/> Resolved tickets ({resolved.length})
          </div>
          <div className="divide-y divide-slate-100">
            {resolved.slice(0, 10).map(t => (
              <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                  </div>
                  <div className="text-sm text-slate-700">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                </div>
                <div className="text-xs text-slate-500">Resolved {formatDate(t.resolved_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40}/>
          <div className="font-semibold text-slate-900">No tickets raised yet</div>
          <div className="text-sm text-slate-500 mt-1">This store has not raised any support tickets.</div>
        </div>
      )}
    </Shell>
  );
}