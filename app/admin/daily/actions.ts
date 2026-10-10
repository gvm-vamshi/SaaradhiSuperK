'use server';

import { createClient } from '@/lib/supabase/server';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false };
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { supabase, ok: p?.role === 'admin' };
}

export async function toggleStoreDaily(storeCode: string, enabled: boolean) {
  const { supabase, ok } = await assertAdmin();
  if (!ok) return { error: 'Admin only.' };
  const { error } = await supabase
    .from('stores')
    .update({ daily_message_enabled: enabled })
    .eq('code', storeCode);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function toggleHideMessage(id: number, hidden: boolean) {
  const { supabase, ok } = await assertAdmin();
  if (!ok) return { error: 'Admin only.' };
  const { error } = await supabase
    .from('sp_daily_messages')
    .update({ is_hidden: hidden })
    .eq('id', id);
  if (error) return { error: error.message };
  return { ok: true };
}