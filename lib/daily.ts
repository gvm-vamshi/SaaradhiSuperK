export interface SparkDay {
  d: string;
  gmv: number;
  colour: 'good' | 'avg' | 'low' | 'none';
  today?: boolean;
}

export interface OppItem {
  key: string;
  label: string;
  how: string;
  value: number;
}

export interface SpDailyMessage {
  id: number;
  report_date: string;
  store_code: string | null;
  store_name: string;
  status: string;
  top_lever: string | null;
  total_opportunity: number | null;
  top_opportunity: number | null;
  action_today: string | null;
  message: string;
  metrics: Record<string, unknown> | null;
  review_flag: string | null;
  is_hidden: boolean;
  first_viewed_at: string | null;
  acted_at: string | null;
  generated_at: string;
}

export function dailyStatusEmoji(status: string): string {
  switch (status) {
    case 'Good': return '🟢';
    case 'Average': return '🟡';
    case 'Low': return '🔴';
    case 'No Sales': return '⚪';
    default: return '⚫';
  }
}

export function dailyStatusTelugu(status: string): string {
  switch (status) {
    case 'Good': return 'బాగుంది';
    case 'Average': return 'సగటు';
    case 'Low': return 'తక్కువ';
    case 'No Sales': return 'అమ్మకాలు లేవు';
    default: return status;
  }
}

export function barColour(c: string): string {
  switch (c) {
    case 'good': return '#1D9E75';
    case 'avg':  return '#EF9F27';
    case 'low':  return '#E24B4A';
    default:     return '#D3D1C7';
  }
}

export function oppIcon(key: string): string {
  switch (key) {
    case 'aov':    return '#DC2626';
    case 'member': return '#1D9E75';
    case 'new':    return '#378ADD';
    case 'walkin': return '#854F0B';
    default:       return '#64748B';
  }
}

export function oppBg(key: string): string {
  switch (key) {
    case 'aov':    return '#FEF2F2';
    case 'member': return '#F0FDF4';
    case 'new':    return '#EFF6FF';
    case 'walkin': return '#FFF8EC';
    default:       return '#F8FAFC';
  }
}

export function formatReportDate(d: string, withYear = true): string {
  const dt = new Date(d + 'T00:00:00Z');
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit', month: withYear ? 'long' : 'short',
    ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC',
  });
}

const TE_WEEKDAYS = ['ఆదివారం','సోమవారం','మంగళవారం','బుధవారం','గురువారం','శుక్రవారం','శనివారం'];
export function teluguWeekday(d: string): string {
  const dt = new Date(d + 'T00:00:00Z');
  return TE_WEEKDAYS[dt.getUTCDay()];
}

export function rupees(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

export function rupeesShort(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
  return '₹' + v.toLocaleString('en-IN');
}

export function num(v: unknown): number | null {
  const n = Number(v);
  return isFinite(n) ? n : null;
}