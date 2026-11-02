'use client';

/**
 * SP Daily — Sales Opportunity band (three-bar version)
 *
 * Shows, scaled against the reachable total:
 *   1. ఇప్పటివరకు అమ్మారు        — sold so far this month (MTD actual)
 *   2. ఇదే వేగంతో నెలాఖరుకి      — projected month-end at current pace (weekday-aware)
 *   3. కొంచెం ఎక్కువ ప్రయత్నిస్తే — reachable with a little more effort (projected + opportunity left)
 *
 * The opportunity (reachable − projected) is already day-scaled upstream in Apps Script,
 * so it shrinks naturally as the month progresses.
 *
 * Props come straight from sp_daily_messages.metrics:
 *   gmv_mtd, projected_gmv, reachable_total
 */

function rupeeIN(n: number): string {
  n = Math.round(n || 0);
  const s = String(Math.abs(n));
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  if (rest) last3 = ',' + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + (n < 0 ? '-' : '') + rest + last3;
}

export function OpportunityBand({
  mtd,
  projected,
  reachable,
}: {
  mtd: number;
  projected: number;
  reachable: number;
}) {
  // Guard / clamp so bars always make sense
  const m = Math.max(0, mtd || 0);
  const p = Math.max(m, projected || 0);
  const r = Math.max(p, reachable || 0);
  const opp = Math.max(0, r - p);

  const max = r > 0 ? r : 1;
  const pct = (v: number) => Math.max(8, Math.round((v / max) * 100)); // min 8% so tiny bars stay visible

  const rows = [
    {
      emoji: '😊',
      label: 'ఇప్పటివరకు అమ్మారు',
      sub: 'Ippativaraku',
      value: m,
      width: pct(m),
      fill: '#8BC34A',
      pill: '#2E7D32',
    },
    {
      emoji: '📈',
      label: 'ఇదే వేగంతో నెలాఖరుకి',
      sub: 'Ee vegamto nelakharuki',
      value: p,
      width: pct(p),
      fill: '#2E7D32',
      pill: '#1B5E20',
    },
    {
      emoji: '🎯',
      label: 'కొంచెం ఎక్కువ ప్రయత్నిస్తే',
      sub: 'Konchem ekkuva prayatiste',
      value: r,
      width: 100,
      fill: '#E53935',
      pill: '#C62828',
    },
  ];

  return (
    <div
      className="rounded-2xl p-4 sm:p-5"
      style={{
        background: '#FBF4E6',
        border: '1px solid #F0E3C8',
      }}
    >
      <div className="text-center font-bold text-[15px] sm:text-base text-slate-800 mb-4 leading-snug">
        ఈ నెల ఇంకా <span style={{ color: '#E53935' }}>{rupeeIN(opp)}</span> ఎక్కువ అమ్మొచ్చు!
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i}>
            <div className="flex items-center gap-1.5 mb-1 text-[13px] sm:text-sm text-slate-700">
              <span>{row.emoji}</span>
              <span className="font-medium">{row.label}</span>
            </div>
            <div
              className="relative h-8 rounded-lg overflow-hidden"
              style={{ background: '#E8F0E0' }}
            >
              <div
                className="h-full rounded-lg flex items-center transition-all"
                style={{ width: `${row.width}%`, background: row.fill }}
              >
                <span
                  className="ml-2 px-2 py-0.5 rounded-md text-white text-[13px] sm:text-sm font-bold whitespace-nowrap"
                  style={{ background: row.pill }}
                >
                  {rupeeIN(row.value)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}