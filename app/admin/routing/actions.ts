'use server';

import { createClient } from '@/lib/supabase/server';

export async function toggleAgentRouting(agentId: string, active: boolean) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Admin only.' };

  const { error } = await supabase
    .from('profiles')
    .update({ routing_active: active })
    .eq('id', agentId)
    .eq('role', 'agent');

  if (error) return { error: error.message };
  return { ok: true };
}

export async function reassignTicket(ticketId: number, agentId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Admin only.' };

  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: agentId })
    .eq('id', ticketId);

  if (error) return { error: error.message };
  return { ok: true };
}