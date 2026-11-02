'use client';

import { useEffect, useState, useTransition } from 'react';
import { OpportunityBand } from './OpportunityBand';
// Adjust these two imports to match your project if the names/paths differ:
import { markViewed, markActed } from './actions';
import type { SpDailyMessage } from '@/lib/daily';

/* ---------- helpers ---------- */
function rupeeIN(n: number): string {
  n = Math.round(n || 0);
  const s = String(Math.abs(n));
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  if (rest) last3 = ',' + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + (n < 0 ? '-' : '') + rest + last3;
}

type Spark = { d: string; gmv: number; colour: string; today?: boolean };
type Opp = { key: string; label: string; how: string; value: number };

const BAR = {
  good: '#22C55E',
  avg: '#F59E0B',
  low: '#EF4444',
  none: '#CBD5E1',
};

export function DailyMessageView({ msg: message }: { msg: SpDailyMessage }) {
  const [open, setOpen] = useState(false);
  const [acted, setActed] = useState(!!message.acted_at);
  const [pending, start] = useTransition();

  const m: any = message.metrics || {};
  const spark: Spark[] = Array.isArray(m.spark) ? m.spark : [];
  const opps: Opp[] = Array.isArray(m.opp_break) ? m.opp_break : [];

  const mtd = Number(m.gmv_mtd || 0);
  const projected = Number(m.projected_gmv || 0);
  const reachable = Number(m.reachable_total || 0);
  const todayEst = Number(m.today_estimate || 0);

  // mark as viewed once
  useEffect(() => {
    if (!message.first_viewed_at) {
      markViewed(message.id).catch(() => {});
    }
  }, [message.id, message.first_viewed_at]);

  const statusHead: Record<string, { bg: string; emoji: string; line: string }> = {
    Good:    { bg: 'from-green-600 to-green-700',  emoji: '🎉', line: 'నిన్న చాలా మంచి రోజు!' },
    Average: { bg: 'from-red-600 to-red-700',      emoji: '☀️', line: 'శుభోదయం!' },
    Low:     { bg: 'from-red-600 to-red-700',      emoji: '💪', line: 'ఈరోజు cover చేద్దాం!' },
    'No Sales': { bg: 'from-slate-600 to-slate-700', emoji: '📅', line: 'ఈరోజు మొదలుపెడదాం!' },
  };
  const head = statusHead[message.status] || statusHead['Average'];

  const maxBar = Math.max(1, ...spark.map(s => s.gmv));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`bg-gradient-to-r ${head.bg} rounded-2xl p-5 text-white`}>
        <div className="text-2xl font-bold flex items-center gap-2">
          <span>{head.emoji}</span> {head.line}
        </div>
        <div className="opacity-90 mt-1 text-sm">{message.store_name}</div>
        {todayEst > 0 && (
          <div className="mt-4 bg-white/15 rounded-xl px-4 py-3">
            <div className="text-xs opacity-90">ఈరోజు అంచనా · today’s usual</div>
            <div className="text-2xl font-bold">{rupeeIN(todayEst)}</div>
          </div>
        )}
      </div>

      {/* 7-day bars */}
      {spark.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-700 mb-3">గత 7 రోజులు · last 7 days</div>
          <div className="flex items-end justify-between gap-1.5" style={{ height: 120 }}>
            {spark.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-[10px] text-slate-500 mb-1">{s.gmv ? Math.round(s.gmv / 1000) + 'k' : ''}</div>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${Math.max(4, (s.gmv / maxBar) * 90)}px`,
                    background: BAR[s.colour as keyof typeof BAR] || BAR.none,
                    outline: s.today ? '2px solid #1e293b' : 'none',
                  }}
                />
                <div className="text-[11px] text-slate-600 mt-1">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity band (3 bars) */}
      {reachable > 0 && (
        <OpportunityBand mtd={mtd} projected={projected} reachable={reachable} />
      )}

      {/* Opportunity breakdown */}
      {opps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="text-sm font-semibold text-slate-700">ఎలా? · how</div>
          {opps.map((o, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <div className="text-slate-700">
                <span className="font-medium">{o.label}</span>
                <span className="text-slate-500"> — {o.how}</span>
              </div>
              <div className="font-bold text-green-700 whitespace-nowrap">{rupeeIN(o.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action + Noted/Done */}
      {message.action_today && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="text-xs font-semibold text-amber-700 mb-1">🎯 ఈరోజు చేయవలసింది · today’s action</div>
          <div className="text-slate-800 font-medium">{message.action_today}</div>
          <button
            disabled={acted || pending}
            onClick={() =>
              start(async () => {
                try { await markActed(message.id); setActed(true); } catch {}
              })
            }
            className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold ${
              acted
                ? 'bg-green-100 text-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {acted ? '✓ చేసాను · Done' : 'చేస్తాను · Noted'}
          </button>
        </div>
      )}

      {/* More details */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-sm text-slate-600 bg-white border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50"
      >
        {open ? '▲ దాచు' : '▼ మరిన్ని details'}
      </button>
      {open && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
            {message.message}
          </pre>
        </div>
      )}
    </div>
  );
}