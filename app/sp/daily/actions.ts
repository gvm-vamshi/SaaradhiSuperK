'use server';

import { createClient } from '@/lib/supabase/server';

export async function markViewed(id: number) {
  const supabase = await createClient();
  await supabase.rpc('mark_daily_message_viewed', { p_id: id });
  return { ok: true };
}

export async function markActed(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('mark_daily_acted', { p_id: id });
  if (error) return { error: error.message };
  return { ok: true };
}