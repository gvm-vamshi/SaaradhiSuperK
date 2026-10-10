'use server';

import { createClient } from '@/lib/supabase/server';

export async function markViewed(id: number) {
  const supabase = await createClient();
  await supabase.rpc('mark_daily_message_viewed', { p_id: id });
  return { ok: true };
}