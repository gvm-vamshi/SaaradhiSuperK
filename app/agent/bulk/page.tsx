// Drop this in BOTH:  app/admin/bulk/page.tsx  and  app/agent/bulk/page.tsx
// (RLS lets admin and agent read/update bulk orders and toggle store eligibility.)
import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { PackagePlus } from 'lucide-react';
import { BulkReview } from '@/app/components/BulkReview';
import { BulkStoreToggles } from '@/app/components/BulkStoreToggles';
import type { BulkOrder } from '@/lib/bulk';

export const dynamic = 'force-dynamic';

export default async function BulkReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = '' } = await searchParams;
  const supabase = await createClient();

  // Orders
  let q = supabase
    .from('bulk_orders')
    .select('id, order_code, store_name, delivery_date, items, line_count, total_qty, reason, status, enriched, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);
  const { data } = await q as unknown as { data: BulkOrder[] };
  const orders = data || [];
  const pending = orders.filter(o => o.status === 'Pending').length;

  // Stores (for the eligibility toggle)
  const { data: storesRaw } = await supabase
    .from('stores')
    .select('code, name, region, bulk_order_enabled')
    .order('name') as unknown as {
      data: { code: string; name: string; region: string | null; bulk_order_enabled: boolean }[];
    };
  const stores = (storesRaw || [])
    .filter(s => s.region !== 'INACTIVE')
    .map(s => ({ code: s.code, name: s.name, bulk_order_enabled: !!s.bulk_order_enabled }));

  return (
    <Shell title="Bulk Orders" icon={<PackagePlus size={20} />} accent="slate">
      <BulkStoreToggles stores={stores} />

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