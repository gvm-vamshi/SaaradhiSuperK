// app/sp/bulk/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { pickOpenDeliveryDates } from '@/lib/bulk';
import type { SkuHit, CartItem } from '@/lib/bulk';

// --- SKU search. Returns stock so the form can flag out-of-stock items. ---
export async function searchSku(q: string): Promise<SkuHit[]> {
  const term = (q || '').trim();
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('sku_master')
    .select('product_id, product_name, alias, selling_price, on_shelf_available')
    .or(`product_name.ilike.%${term}%,alias.ilike.%${term}%`)
    .limit(40);
  return (data || []).map((r: any) => ({
    id: String(r.product_id),
    name: r.product_name || '',
    alias: r.alias || '',
    sp: Number(r.selling_price) || 0,
    stock: Number(r.on_shelf_available) || 0,
  }));
}

// --- Submit a bulk order. Reason required; price/stock re-read server-side. ---
export async function submitBulkOrder(input: { items: { id: string; qty: number }[]; deliveryDate: string; reason: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const reason = (input.reason || '').trim();
  if (!reason) return { error: 'Please write a reason for this order.' };

  const { data: profile } = await supabase
    .from('profiles').select('store_code').eq('id', user.id).single();
  if (!profile?.store_code) return { error: 'No store assigned to this account.' };

  const { data: store } = await supabase
    .from('stores').select('name, bulk_order_enabled').eq('code', profile.store_code).single();
  if (!store?.bulk_order_enabled) return { error: 'Bulk ordering is not enabled for your store.' };
  const storeName = store?.name || profile.store_code;

  // Re-validate the open delivery date server-side.
  const today = new Date().toISOString().slice(0, 10);
  const { data: sched } = await supabase
    .from('store_delivery_schedule').select('delivery_date')
    .eq('store_name', storeName).gte('delivery_date', today);
  const openDates = pickOpenDeliveryDates((sched || []).map((s: any) => s.delivery_date), 2);
  if (!openDates.includes(input.deliveryDate)) {
    return { error: 'That delivery date is closed (cutoff is 10 AM the day before). Pick an open date.' };
  }

  // Authoritative price + stock from the catalogue (never trust the client).
  const ids = (input.items || []).map(i => i.id).filter(Boolean);
  if (!ids.length) return { error: 'Add at least one SKU.' };
  const { data: skus } = await supabase
    .from('sku_master')
    .select('product_id, product_name, alias, selling_price, on_shelf_available')
    .in('product_id', ids);
  const byId: Record<string, any> = {};
  for (const s of skus || []) byId[String(s.product_id)] = s;

  const items = (input.items || [])
    .filter(i => (Number(i.qty) || 0) > 0 && byId[i.id])
    .map(i => {
      const s = byId[i.id];
      return {
        id: String(s.product_id),
        name: s.product_name || '',
        alias: s.alias || '',
        sp: Number(s.selling_price) || 0,
        qty: Number(i.qty) || 0,
        wh_stock: Number(s.on_shelf_available) || 0,
        confirmed: true, // default confirmed; admin can un-confirm for partial
      };
    });
  if (!items.length) return { error: 'Add at least one valid SKU with a quantity.' };

  const totalQty = items.reduce((a, i) => a + i.qty, 0);
  const stamp = new Date();
  const code = 'BULK-' + stamp.toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + Math.floor(Math.random() * 900 + 100);

  const { error } = await supabase.from('bulk_orders').insert({
    order_code: code,
    store_code: profile.store_code,
    store_name: storeName,
    sp_id: user.id,
    delivery_date: input.deliveryDate,
    items,
    line_count: items.length,
    total_qty: totalQty,
    reason,
    status: 'Pending',
    enriched: false,
  });
  if (error) return { error: error.message };
  return { ok: true, orderCode: code, deliveryDate: input.deliveryDate };
}

// --- Admin/agent: change overall status ---
export async function updateBulkStatus(id: number, status: 'Approved' | 'Rejected' | 'Added' | 'Cancelled' | 'Partial') {
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

// --- Admin/agent: partial confirmation — set which items are confirmed ---
export async function confirmBulkItems(id: number, confirmedIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!me || (me.role !== 'admin' && me.role !== 'agent')) return { error: 'Not allowed.' };

  const { data: order } = await supabase.from('bulk_orders').select('items').eq('id', id).single();
  if (!order) return { error: 'Order not found.' };
  const set = new Set(confirmedIds.map(String));
  const items = (order.items || []).map((it: any) => ({ ...it, confirmed: set.has(String(it.id)) }));
  const allConfirmed = items.every((it: any) => it.confirmed);
  const noneConfirmed = items.every((it: any) => !it.confirmed);
  const status = noneConfirmed ? 'Rejected' : allConfirmed ? 'Added' : 'Partial';

  const { error } = await supabase
    .from('bulk_orders')
    .update({ items, status, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq('id', id);
  if (error) return { error: error.message };
  return { ok: true, status };
}

// --- Admin/agent: enable/disable bulk ordering for a store ---
export async function setBulkEnabled(storeCode: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!me || (me.role !== 'admin' && me.role !== 'agent')) return { error: 'Not allowed.' };
  const { error } = await supabase.from('stores').update({ bulk_order_enabled: enabled }).eq('code', storeCode);
  if (error) return { error: error.message };
  return { ok: true };
}