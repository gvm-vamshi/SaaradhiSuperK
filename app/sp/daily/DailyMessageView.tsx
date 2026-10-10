'use client';

import { useEffect } from 'react';
import { dailyStatusEmoji, dailyStatusTelugu, formatReportDate, type SpDailyMessage } from '@/lib/daily';
import { markViewed } from './actions';

export function DailyMessageView({ msg }: { msg: SpDailyMessage }) {
  useEffect(() => {
    if (!msg.first_viewed_at) {
      markViewed(msg.id).catch(() => {});
    }
  }, [msg.id, msg.first_viewed_at]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{dailyStatusEmoji(msg.status)}</span>
        <span className="font-bold text-slate-900">నిన్నటి performance — {dailyStatusTelugu(msg.status)}</span>
      </div>
      <div className="text-xs text-slate-500 mb-4">{formatReportDate(msg.report_date)}</div>
      <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800 border-t border-slate-100 pt-4">
        {msg.message}
      </div>
    </div>
  );
}