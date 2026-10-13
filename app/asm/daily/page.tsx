import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { CalendarDays } from 'lucide-react';
import { dailyStatusEmoji, formatReportDate, rupees, type SpDailyMessage } from '@/lib/daily';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AsmDaily({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single() as unknown as { data: Profile };

  let reportDate = date || '';
  if (!reportDate) {
    const { data: latest } = await supabase
      .from('sp_daily_messages').select('report_date')
      .order('report_date', { ascending: false }).limit(1);
    reportDate = latest?.[0]?.report_date ?? '';
  }

  const { data: storesRaw } = await supabase
    .from('stores').select('code, name, region, daily_message_enabled')
    .eq('asm_owner', profile.full_name).order('name') as unknown as {
      data: { code: string; name: string; region: string | null; daily_message_enabled: boolean }[];
    };
  const stores = (storesRaw || []).filter(s => s.region !== 'INACTIVE');

  let msgs: SpDailyMessage[] = [];
  if (reportDate) {
    const { data } = await supabase
      .from('sp_daily_messages').select('*').eq('report_date', reportDate) as unknown as { data: SpDailyMessage[] };
    msgs = data || [];
  }
  const byCode: Record<string, SpDailyMessage> = {};
  for (const m of msgs) if (m.store_code) byCode[m.store_code] = m;

  const enabled = stores.filter(s => s.daily_message_enabled);
  const notEnabled = stores.filter(s => !s.daily_message_enabled);
  const rows = enabled.map(s => ({ s, m: byCode[s.code] }));
  const withMsg = rows.filter(r => r.m);

  const counts = { Good: 0, Average: 0, Low: 0 } as Record<string, number>;
  let totalOpp = 0, viewed = 0, acted = 0;
  for (const r of withMsg) {
    if (counts[r.m!.status] !== undefined) counts[r.m!.status]++;
    totalOpp += Number(r.m!.total_opportunity || 0);
    if (r.m!.first_viewed_at) viewed++;
    if (r.m!.acted_at) acted++;
  }

  return (
    <Shell title="Daily Messages" subtitle={profile.full_name} icon={<CalendarDays size={20} />} accent="violet">
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-slate-500">
              Report date <b className="text-slate-900">{reportDate ? formatReportDate(reportDate) : 'none yet'}</b>
              {' · '}{enabled.length} of {stores.length} stores enabled
            </div>
            <form method="get" className="flex items-center gap-2">
              <input type="date" name="date" defaultValue={reportDate}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-violet-500" />
              <button className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700">Go</button>
            </form>
          </div>
          <div className="mt-3 text-sm flex flex-wrap gap-4">
            <span>🟢 {counts.Good}</span><span>🟡 {counts.Average}</span><span>🔴 {counts.Low}</span>
            <span>Opportunity: <b>{rupees(totalOpp)}</b></span>
            <span>Viewed: <b>{viewed}/{withMsg.length}</b></span>
            <span>Acted: <b>{acted}/{withMsg.length}</b></span>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
            No stores enabled yet. Ask admin to enable this feature for your stores.
          </div>
        )}

        <div className="space-y-2">
          {rows.map(({ s, m }) => (
            <details key={s.code} className="bg-white rounded-xl border border-slate-200">
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-3 list-none">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{s.name}</div>
                  <div className="text-xs text-slate-500">{m ? `${m.top_lever ?? '—'} · ${rupees(m.total_opportunity)}` : 'No message'}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-sm">
                  <span>{m ? `${dailyStatusEmoji(m.status)} ${m.status}` : '—'}</span>
                  <span className={m?.first_viewed_at ? 'text-emerald-600' : 'text-slate-400'}>{m ? (m.first_viewed_at ? 'Viewed ✓' : 'Not viewed') : ''}</span>
                  <span className={m?.acted_at ? 'text-emerald-600 font-medium' : 'text-slate-400'}>{m ? (m.acted_at ? 'Acted ✓' : 'Not acted') : ''}</span>
                </div>
              </summary>
              {m && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  {m.action_today && <div className="text-xs text-slate-500 mt-3">Idea: {m.action_today}</div>}
                  <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed mt-3">{m.message}</div>
                </div>
              )}
            </details>
          ))}
        </div>

        {notEnabled.length > 0 && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-600 mb-2">Not enabled ({notEnabled.length})</div>
            <div className="text-xs text-slate-500">{notEnabled.map(s => s.name).join(' · ')}</div>
          </div>
        )}

        <Link href="/asm" className="text-sm text-slate-600 hover:text-slate-900 inline-block">← Back to tickets</Link>
      </div>
    </Shell>
  );
}