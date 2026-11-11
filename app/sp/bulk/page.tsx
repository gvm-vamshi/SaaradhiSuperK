// app/sp/bulk/page.tsx
import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { PackagePlus } from 'lucide-react';
import { pickOpenDeliveryDates, type BulkOrder } from '@/lib/bulk';
import { BulkOrderForm } from './BulkOrderForm';

export const dynamic = 'force-dynamic';

export default async function SpBulkOrder() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('store_code').eq('id', user!.id).single();

  const { data: store } = await supabase
    .from('stores').select('name, bulk_order_enabled').eq('code', profile?.store_code ?? '').single();
  const storeName = store?.name ?? profile?.store_code ?? '';

  // Hidden unless admin/agent enabled bulk ordering for this store.
  if (!store?.bulk_order_enabled) {
    return (
      <Shell title="Bulk Order · బల్క్ ఆర్డర్" icon={<PackagePlus size={20} />} accent="red">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800">
          బల్క్ ఆర్డర్ మీ store కి ఇంకా అందుబాటులో లేదు. (Bulk ordering isn’t enabled for your store yet. Please contact your SAE / ASM.)
        </div>
      </Shell>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: sched } = await supabase
    .from('store_delivery_schedule')
    .select('delivery_date')
    .eq('store_name', storeName)
    .gte('delivery_date', today);

  const dates = (sched || []).map((s: any) => s.delivery_date);
  const openDates = pickOpenDeliveryDates(dates, 2); // next 2 open delivery dates
  const hasSchedule = dates.length > 0;

  // Recent orders by this store
  const { data: recent } = await supabase
    .from('bulk_orders')
    .select('id, order_code, store_name, delivery_date, items, line_count, total_qty, reason, status, enriched, created_at')
    .eq('store_code', profile?.store_code ?? '')
    .order('created_at', { ascending: false })
    .limit(5) as unknown as { data: BulkOrder[] };

  return (
    <Shell title="Bulk Order · బల్క్ ఆర్డర్" icon={<PackagePlus size={20} />} accent="red">
      <BulkOrderForm
        storeName={storeName}
        openDates={openDates}
        hasSchedule={hasSchedule}
        recent={recent || []}
      />
    </Shell>
  );
}