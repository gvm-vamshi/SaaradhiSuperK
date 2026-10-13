'use client';

import { useEffect, useState } from 'react';
import {
  barColour, oppIcon, oppBg, dailyStatusTelugu, formatReportDate, teluguWeekday,
  rupees, rupeesShort, num,
  type SpDailyMessage, type SparkDay, type OppItem,
} from '@/lib/daily';
import { markViewed, markActed } from './actions';

export function DailyMessageView({ msg }: { msg: SpDailyMessage }) {
  const [acted, setActed] = useState(!!msg.acted_at);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!msg.first_viewed_at) markViewed(msg.id).catch(() => {});
  }, [msg.id, msg.first_viewed_at]);

  const m = (msg.metrics || {}) as Record<string, unknown>;
  const spark = (Array.isArray(m.spark) ? m.spark : []) as SparkDay[];
  const oppItems = (Array.isArray(m.opp_break) ? m.opp_break : []) as OppItem[];
  const maxGmv = Math.max(1, ...spark.map(s => s.gmv || 0));

  const todayEst = num(m.today_estimate);
  const yGmv = num(m.yesterday_gmv);
  const totalOpp = num(msg.total_opportunity);

  const isGood = msg.status === 'Good';
  const isLow = msg.status === 'Low';
  const isNoSales = msg.status === 'No Sales';

  const statusLine = isGood ? 'నిన్న sale బాగుంది!'
    : isLow ? 'నిన్న sale తక్కువ'
    : isNoSales ? 'నిన్న sale నమోదు కాలేదు'
    : 'నిన్న sale సాధారణం';
  const statusBg = isGood ? '#E1F5EE' : isLow ? '#FCEBEB' : '#FAEEDA';
  const statusFg = isGood ? '#0F6E56' : isLow ? '#A32D2D' : '#854F0B';
  const statusVal = isGood ? '#085041' : isLow ? '#791F1F' : '#633806';
  const statusIcon = isGood ? '▲' : isLow ? '▼' : '•';

  const onNoted = () => {
    setActed(true);
    markActed(msg.id).catch(() => setActed(false));
  };

  // month vs last month rows
  const chg = (a: number | null, b: number | null) =>
    (a !== null && b) ? (a - b) / b : null;
  const arrow = (c: number | null) => {
    if (c === null) return null;
    const p = Math.round(Math.abs(c) * 100);
    return { up: c >= 0, text: (c >= 0 ? '▲ ' : '▼ ') + p + '%' };
  };
  const detail = [
    { label: 'Sales', val: rupeesShort(num(m.gmv_mtd)), c: arrow(chg(num(m.gmv_mtd), num(m.gmv_lmtd))) },
    { label: 'Customers', val: (num(m.walkins_mtd) ?? 0).toLocaleString('en-IN'), c: arrow(chg(num(m.walkins_mtd), num(m.walkins_lmtd))) },
    { label: 'Member visits', val: (num(m.member_walkins_mtd) ?? 0).toLocaleString('en-IN'), c: arrow(chg(num(m.member_walkins_mtd), num(m.member_walkins_lmtd))) },
    { label: 'AOV (bill value)', val: rupees(num(m.aov_mtd)), c: arrow(chg(num(m.aov_mtd), num(m.aov_lmtd))) },
    { label: 'New members', val: (num(m.new_members_mtd) ?? 0).toLocaleString('en-IN'), c: arrow(chg(num(m.new_members_mtd), num(m.new_members_lmtd))) },
  ];

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {/* Red header */}
      <div style={{ background: 'linear-gradient(135deg,#DC2626 0%,#B01818 100%)', borderRadius: '20px 20px 0 0', padding: '18px 18px 46px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: todayEst !== null ? 16 : 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>☀️</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>శుభోదయం 🙏</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{msg.store_name} · {formatReportDate(msg.report_date, false)}, {teluguWeekday(msg.report_date)}</div>
          </div>
        </div>

        {todayEst !== null && (
          <div style={{ background: 'rgba(255,255,255,0.14)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>ఈరోజు అంచనా</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>మీ {teluguWeekday(msg.report_date).replace('వారం','')}వారం సగటు sale</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: '#fff' }}>{rupees(todayEst)}</div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 12px', marginTop: -32, position: 'relative' }}>

        {/* Week trend */}
        {spark.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>మీ అమ్మకాలు — ఈ వారం</span>
              <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>7 రోజులు</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7, height: 88, marginBottom: 12 }}>
              {spark.map((s, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: '100%',
                    height: Math.max(8, Math.round((s.gmv / maxGmv) * 80)),
                    background: barColour(s.colour),
                    borderRadius: 5,
                    boxShadow: s.today ? '0 0 0 2px #fff, 0 0 0 3.5px #0F6E56' : 'none',
                  }} />
                  <span style={{ fontSize: 11, color: s.today ? '#0F6E56' : '#94A3B8', fontWeight: s.today ? 600 : 400 }}>{s.d}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: statusBg, borderRadius: 10, padding: '10px 12px' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: statusFg }}>{statusIcon} {statusLine}</span>
              {yGmv !== null && yGmv > 0 && <span style={{ fontSize: 15, fontWeight: 600, color: statusVal }}>{rupees(yGmv)}</span>}
            </div>
          </div>
        )}

        {/* Opportunity */}
        {totalOpp !== null && totalOpp > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#FFF8EC 0%,#FDEFD3 100%)', border: '0.5px solid #FAC775', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 4px 14px rgba(133,79,11,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#854F0B', marginBottom: 12 }}>ఈ నెల sale అవకాశం</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 8px rgba(220,38,38,0.3)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/superk-k.png" alt="SuperK" width={36} height={36} style={{ objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, color: '#5A3406', lineHeight: 1 }}>{rupees(totalOpp)}</div>
                <div style={{ fontSize: 13, color: '#854F0B', marginTop: 3 }}>ఈ నెల ఇంకా sale చేయవచ్చు</div>
              </div>
            </div>
          </div>
        )}

        {/* Action */}
        {msg.action_today && (
          <div style={{ background: '#fff', border: '1.5px solid #DC2626', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 4px 14px rgba(220,38,38,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>💡</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>ఈరోజు ఒక చిన్న idea</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🛒</div>
              <div style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.5 }}>{msg.action_today}</div>
            </div>
            <button
              onClick={onNoted}
              disabled={acted}
              style={{
                width: '100%', height: 46, borderRadius: 12, border: 'none',
                background: acted ? '#1D9E75' : '#DC2626',
                fontSize: 15, fontWeight: 600, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: acted ? 'default' : 'pointer',
              }}
            >
              {acted ? '✓ Done' : 'Noted'}
            </button>
          </div>
        )}

        {/* Details toggle */}
        <div style={{ textAlign: 'center', paddingBottom: 4 }}>
          <button onClick={() => setShowDetails(v => !v)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            మరిన్ని details {showDetails ? '▲' : '▼'}
          </button>
        </div>

        {showDetails && (
          <div style={{ marginTop: 4 }}>
            {oppItems.length > 0 && (
              <div style={{ background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>{rupees(totalOpp)} sale అవకాశం ఎలా?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {oppItems.map((o, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, background: oppBg(o.key), borderRadius: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: oppIcon(o.key), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700 }}>
                        {o.key === 'aov' ? '🛒' : o.key === 'member' ? '👥' : o.key === 'new' ? '✚' : '🚶'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{o.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: oppIcon(o.key) }}>{rupees(o.value)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginTop: 2 }}>{o.how}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #E2E8F0' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>మొత్తం sale అవకాశం</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#854F0B' }}>{rupees(totalOpp)}</span>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: '0.5px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>ఈ నెల vs గత నెల</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {detail.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#64748B' }}>{d.label}</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>
                      {d.val}{d.c && <span style={{ color: d.c.up ? '#0F6E56' : '#E24B4A', marginLeft: 5 }}>{d.c.text}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full original message, for anyone who wants the words */}
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12, color: '#94A3B8', cursor: 'pointer', textAlign: 'center' }}>పూర్తి message</summary>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#334155', lineHeight: 1.7, marginTop: 10, background: '#F8FAFC', borderRadius: 12, padding: 14 }}>{msg.message}</div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}