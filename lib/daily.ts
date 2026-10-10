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
  
  /** 'YYYY-MM-DD' -> '11 Oct 2026' (UTC-safe, no timezone shift) */
  export function formatReportDate(d: string, withYear = true): string {
    const dt = new Date(d + 'T00:00:00Z');
    return dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    });
  }
  
  export function rupees(n: number | null | undefined): string {
    if (n === null || n === undefined) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  }