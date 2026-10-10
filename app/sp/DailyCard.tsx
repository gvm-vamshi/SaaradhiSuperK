import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { dailyStatusEmoji, dailyStatusTelugu, rupees } from '@/lib/daily';

export async function DailyCard() {
  const supabase = await createClient();

  // RLS returns nothing when the feature is off for this store
  const { data } = await supabase
    .from('sp_daily_messages')
    .select('id, report_date, status, total_opportunity')
    .order('report_date', { ascending: false })
    .limit(1);

  const latest = data?.[0];
  if (!latest) return null;

  return (
    <Link href="/sp/daily" className="block">
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-red-300 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900">📊 రోజువారీ performance</div>
            <div className="text-sm text-slate-600 mt-1">
              {dailyStatusEmoji(latest.status)} నిన్న: {dailyStatusTelugu(latest.status)}
              {latest.total_opportunity != null && ` · అవకాశం ${rupees(latest.total_opportunity)}`}
            </div>
          </div>
          <span className="text-red-600 text-sm">చూడండి →</span>
        </div>
      </div>
    </Link>
  );
}