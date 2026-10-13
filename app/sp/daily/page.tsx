import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { BarChart3 } from 'lucide-react';
import { dailyStatusEmoji, dailyStatusTelugu, formatReportDate, rupees, type SpDailyMessage } from '@/lib/daily';
import { DailyMessageView } from './DailyMessageView';

export const dynamic = 'force-dynamic';

export default async function SpDaily({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const supabase = await createClient();

  const { data: msgs } = await supabase
    .from('sp_daily_messages')
    .select('*')
    .order('report_date', { ascending: false }) as unknown as { data: SpDailyMessage[] };

  const all = msgs || [];

  if (all.length === 0) {
    return (
      <Shell title="రోజువారీ performance" icon={<BarChart3 size={20} />} accent="red">
        <div className="max-w-xl mx-auto text-center py-16 text-slate-600">
          ఈ feature మీ store కి ఇంకా available కాలేదు.
        </div>
      </Shell>
    );
  }

  const current = (date ? all.find(m => m.report_date === date) : null) ?? all[0];
  const others = all.filter(m => m.id !== current.id);

  return (
    <Shell title="రోజువారీ performance" icon={<BarChart3 size={20} />} accent="red">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/sp" className="text-sm text-slate-600 hover:text-slate-900">← వెనక్కి</Link>

        <DailyMessageView key={current.id} msg={current} />

        {others.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="font-semibold text-slate-900 mb-3">గత రోజులు</div>
            <div className="space-y-2">
              {others.map(m => (
                <Link key={m.id} href={`/sp/daily?date=${m.report_date}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 border border-slate-100">
                  <span className="text-sm">
                    {dailyStatusEmoji(m.status)} {formatReportDate(m.report_date, false)} · {dailyStatusTelugu(m.status)}
                  </span>
                  {m.total_opportunity != null && (
                    <span className="text-sm text-slate-600">{rupees(m.total_opportunity)}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}