// app/sp/bulk/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { pickOpenDeliveryDates } from '@/lib/bulk';
import type { SkuHit, CartItem } from '@/lib/bulk';

// --- SKU search (server-side; warehouse stock never leaves the server) ---
export async function searchSku(q: string): Promise<SkuHit[]> {
  const term = (q || '').trim();
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('sku_master')
    .select('product_id, product_name, alias, selling_price')
    .or(`product_name.ilike.%${term}%,alias.ilike.%${term}%`)
    .limit(40);
  return (data || []).map((r: any) => ({
    id: String(r.product_id),
    name: r.product_name || '',
    alias: r.alias || '',
    sp: Number(r.selling_price) || 0,
  }));
}

// --- Submit a bulk order (re-validates the cutoff server-side) ---
export async function submitBulkOrder(input: { items: CartItem[]; deliveryDate: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('store_code').eq('id', user.id).single();
  if (!profile?.store_code) return { error: 'No store assigned to this account.' };

  const { data: store } = await supabase
    .from('stores').select('name').eq('code', profile.store_code).single();
  const storeName = store?.name || profile.store_code;

  // Recompute the open delivery date from the schedule — the client cannot pick it.
  const today = new Date().toISOString().slice(0, 10);
  const { data: sched } = await supabase
    .from('store_delivery_schedule')
    .select('delivery_date')
    .eq('store_name', storeName)
    .gte('delivery_date', today);
  const openDates = pickOpenDeliveryDates((sched || []).map((s: any) => s.delivery_date), 2);
  if (!openDates.length) return { error: 'No delivery date is open for ordering right now.' };
  // The chosen date must be one of the open options (cutoff not passed).
  const openDate = input.deliveryDate;
  if (!openDates.includes(openDate)) {
    return { error: 'That delivery date is closed (cutoff is 10 AM the day before). Please pick an open date.' };
  }

  const items = (input.items || []).filter(i => i.id && (Number(i.qty) || 0) > 0);
  if (!items.length) return { error: 'Add at least one SKU with a quantity.' };

  const totalQty = items.reduce((a, i) => a + (Number(i.qty) || 0), 0);
  const stamp = new Date();
  const code = 'BULK-' +
    stamp.toISOString().replace(/[-:T]/g, '').slice(0, 14) +
    '-' + Math.floor(Math.random() * 900 + 100);

  const { error } = await supabase.from('bulk_orders').insert({
    order_code: code,
    store_code: profile.store_code,
    store_name: storeName,
    sp_id: user.id,
    delivery_date: openDate,
    items,
    line_count: items.length,
    total_qty: totalQty,
    status: 'Pending',
  });
  if (error) return { error: error.message };

  return { ok: true, orderCode: code, deliveryDate: openDate };
}

// --- Admin/agent: change status (approve / reject / mark added) ---
export async function updateBulkStatus(id: number, status: 'Approved' | 'Rejected' | 'Added' | 'Cancelled') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };
  const { error } = await supabase
    .from('bulk_orders')
    .update({ status, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq('id', id);
  if (error) return { error: error.message };
  return { ok: true };
}