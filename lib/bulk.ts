// lib/bulk.ts
// Cutoff logic shared by the page and the submit action.
// Ordering for delivery date D closes at 10:00 AM IST on D-1.
// The open date is the earliest upcoming D whose cutoff hasn't passed.

export function cutoffISO(d: string): string {
    const [y, m, day] = d.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, day));
    dt.setUTCDate(dt.getUTCDate() - 1); // day before
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}T10:00:00+05:30`; // 10 AM IST
  }
  
  // Up to `max` upcoming delivery dates whose D-1 10 AM cutoff hasn't passed.
  export function pickOpenDeliveryDates(dates: string[], max = 2, now: Date = new Date()): string[] {
    const upcoming = Array.from(new Set(dates)).sort(); // 'YYYY-MM-DD'
    const open: string[] = [];
    for (const d of upcoming) {
      if (now.getTime() < new Date(cutoffISO(d)).getTime()) open.push(d);
      if (open.length >= max) break;
    }
    return open;
  }
  
  export function formatDeliveryDate(d: string): string {
    const dt = new Date(d + 'T00:00:00+05:30');
    return dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  
  export type SkuHit = { id: string; name: string; alias: string; sp: number; stock?: number };
  export type CartItem = SkuHit & { qty: number };
  export type OrderItem = {
    id: string; name: string; alias: string; sp: number; qty: number;
    wh_stock?: number; sold_30d?: number; selling_days?: number; confirmed?: boolean;
  };
  export type BulkOrder = {
    id: number;
    order_code: string;
    store_name: string;
    delivery_date: string;
    items: OrderItem[];
    line_count: number;
    total_qty: number;
    reason?: string;
    status: string;
    enriched?: boolean;
    created_at: string;
  };