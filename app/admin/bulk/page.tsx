// Drop this in BOTH:  app/admin/bulk/page.tsx  and  app/agent/bulk/page.tsx
// (RLS lets admin and agent read/update all bulk orders.)
import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { PackagePlus } from 'lucide-react';
import { BulkReview } from '@/app/components/BulkReview';
import type { BulkOrder } from '@/lib/bulk';

export const dynamic = 'force-dynamic';

export default async function BulkReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = '' } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from('bulk_orders')
    .select('id, order_code, store_name, delivery_date, items, line_count, total_qty, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);

  const { data } = await q as unknown as { data: BulkOrder[] };
  const orders = data || [];
  const pending = orders.filter(o => o.status === 'Pending').length;

  return (
    <Shell title="Bulk Orders" icon={<PackagePlus size={20} />} accent="slate">
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        {['', 'Pending', 'Approved', 'Added', 'Rejected'].map(s => (
          <a key={s} href={`?status=${s}`}
            className={`text-sm px-3 py-1.5 rounded-lg border ${status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            {s || 'All'}{s === 'Pending' && pending ? ` (${pending})` : ''}
          </a>
        ))}
      </div>
      <BulkReview orders={orders} />
    </Shell>
  );
}