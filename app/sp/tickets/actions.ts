'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TicketStatus } from '@/lib/types';

export async function createTicket(input: {
  category: string;
  sub_category: string;
  other_title: string | null;
  description: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('store_code').eq('id', user.id).single();
  if (!profile?.store_code) return { error: 'No store assigned to this account.' };

  const { data: cat } = await supabase
    .from('categories')
    .select('default_priority')
    .eq('category', input.category)
    .eq('sub_category', input.sub_category)
    .maybeSingle();

  // Round-robin across routing-active agents only
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'agent')
    .eq('routing_active', true)
    .order('full_name');

  let assignedTo: string | null = null;
  if (agents && agents.length > 0) {
    const { data: state } = await supabase
      .from('routing_state').select('last_agent_ix').eq('id', 1).single();
    const nextIx = (((state?.last_agent_ix ?? 0) + 1) % agents.length);
    assignedTo = agents[nextIx].id;
    await supabase.from('routing_state').update({ last_agent_ix: nextIx }).eq('id', 1);
  }

  const { data: created, error } = await supabase
    .from('tickets')
    .insert({
      sp_id: user.id,
      store_code: profile.store_code,
      category: input.category,
      sub_category: input.sub_category,
      other_title: input.other_title,
      priority: cat?.default_priority ?? 'Medium',
      description: input.description,
      status: 'Open',
      assigned_to: assignedTo,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  redirect(`/sp/tickets/${created.id}`);
}

export async function postMessage(ticketId: number, body: string) {
  if (!body.trim()) return { error: 'Message cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found.' };

  // Admin and ASM messages appear as agent to SP
  const senderRole = (profile.role === 'admin' || profile.role === 'asm') ? 'agent' : profile.role;

  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_role: senderRole,
    body: body.trim(),
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateTicketStatus(ticketId: number, status: TicketStatus) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = { status };
  if (status === 'Resolved') patch.resolved_at = new Date().toISOString();
  if (status === 'In Progress') {
    const { data: t } = await supabase
      .from('tickets').select('first_response_at').eq('id', ticketId).single();
    if (!t?.first_response_at) patch.first_response_at = new Date().toISOString();
  }

  const { error } = await supabase.from('tickets').update(patch).eq('id', ticketId);
  if (error) return { error: error.message };
  return { ok: true };
}