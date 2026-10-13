import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { CalendarDays } from 'lucide-react';
import { formatReportDate, rupees, type SpDailyMessage } from '@/lib/daily';
import { DailyAdminTable } from './DailyAdminTable';

export const dynamic = 'force-dynamic';

export default async function AdminDaily({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const supabase = await createClient();

  // Default to the most recent report date that has data
  let reportDate = date || '';
  if (!reportDate) {
    const { data: latest } = await supabase
      .from('sp_daily_messages')
      .select('report_date')
      .order('report_date', { ascending: false })
      .limit(1);
    reportDate = latest?.[0]?.report_date ?? '';
  }

  const { data: storesRaw } = await supabase
    .from('stores')
    .select('code, name, asm_owner, region, daily_message_enabled')
    .order('name') as unknown as {
      data: { code: string; name: string; asm_owner: string | null; region: string | null; daily_message_enabled: boolean }[];
    };

  const stores = (storesRaw || [])
    .filter(s => s.region !== 'INACTIVE' && s.code !== 'TEST001')
    .map(s => ({
      code: s.code,
      name: s.name,
      asm_owner: s.asm_owner,
      daily_message_enabled: s.daily_message_enabled,
    }));

  let msgs: SpDailyMessage[] = [];
  if (reportDate) {
    const { data } = await supabase
      .from('sp_daily_messages')
      .select('*')
      .eq('report_date', reportDate) as unknown as { data: SpDailyMessage[] };
    msgs = data || [];
  }

  const msgByCode: Record<string, SpDailyMessage> = {};
  for (const m of msgs) if (m.store_code) msgByCode[m.store_code] = m;

  const enabled = stores.filter(s => s.daily_message_enabled);
  const enabledMsgs = enabled.map(s => msgByCode[s.code]).filter(Boolean) as SpDailyMessage[];

  const byStatus: Record<string, number> = { Good: 0, Average: 0, Low: 0, 'No Sales': 0 };
  const byLever: Record<string, number> = {};
  let totalOpp = 0;
  let viewed = 0;
  let acted = 0;
  for (const m of enabledMsgs) {
    if (byStatus[m.status] !== undefined) byStatus[m.status]++;
    totalOpp += Number(m.total_opportunity || 0);
    if (m.top_lever && m.top_lever !== 'None') {
      byLever[m.top_lever] = (byLever[m.top_lever] || 0) + Number(m.top_opportunity || 0);
    }
    if (m.first_viewed_at) viewed++;
    if (m.acted_at) acted++;
  }
  const viewedPct = enabledMsgs.length ? Math.round((viewed / enabledMsgs.length) * 100) : 0;
  const actedPct = enabledMsgs.length ? Math.round((acted / enabledMsgs.length) * 100) : 0;

  return (
    <Shell title="Admin Dashboard" icon={<CalendarDays size={20} />} accent="slate">
      <AdminTabs />
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="text-sm text-slate-500">
              Daily messages · report date{' '}
              <b className="text-slate-900">{reportDate ? formatReportDate(reportDate) : 'none yet'}</b>
            </div>
            <form method="get" className="flex items-center gap-2">
              <input
                type="date"
                name="date"
                defaultValue={reportDate}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
              <button className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Go</button>
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Enabled stores</div>
              <div className="text-xl font-bold">{enabled.length} <span className="text-sm font-normal text-slate-500">/ {stores.length}</span></div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Status (enabled)</div>
              <div className="font-semibold">🟢 {byStatus.Good} · 🟡 {byStatus.Average} · 🔴 {byStatus.Low} · ⚪ {byStatus['No Sales']}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Total opportunity</div>
              <div className="text-xl font-bold">{rupees(totalOpp)}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500">Opened / Acted</div>
              <div className="text-xl font-bold">{viewed}/{enabledMsgs.length} <span className="text-sm font-normal text-slate-500">({viewedPct}%)</span></div>
              <div className="text-sm text-slate-600 mt-0.5">Acted: {acted} ({actedPct}%)</div>
            </div>
          </div>

          {Object.keys(byLever).length > 0 && (
            <div className="mt-3 text-sm text-slate-600">
              Biggest lever, by ₹:{' '}
              {Object.entries(byLever)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} ${rupees(v)}`)
                .join(' · ')}
            </div>
          )}
        </div>

        <DailyAdminTable stores={stores} msgByCode={msgByCode} />
      </div>
    </Shell>
  );
}