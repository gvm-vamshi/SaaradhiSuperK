'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { generateBotReply } from '@/lib/gemini';
import { getSpocRouting } from '@/lib/spoc-routing';
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

  // Round-robin across routing-active agents
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
    .select('id, ticket_code')
    .single();

  if (error) return { error: error.message };

  // Fire-and-forget: bot reply + Slack SPOC alert
  // We don't await this so the SP isn't blocked
  botReplyAndAlert(supabase, created.id, created.ticket_code, profile.store_code, input).catch(console.error);

  redirect(`/sp/tickets/${created.id}`);
}

async function botReplyAndAlert(
  supabase: any,
  ticketId: number,
  ticketCode: string,
  storeCode: string,
  input: { category: string; sub_category: string; other_title: string | null; description: string }
) {
  // Get store info
  const { data: store } = await supabase
    .from('stores').select('name, phone').eq('code', storeCode).single();

  // Generate Gemini reply
  const botReply = await generateBotReply({
    category: input.category,
    sub_category: input.sub_category,
    other_title: input.other_title,
    description: input.description,
    store_name: store?.name || storeCode,
  });

  // Insert bot reply as agent message
  if (botReply) {
    await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender_id: '00000000-0000-0000-0000-000000000000', // system/bot user
      sender_role: 'agent',
      body: botReply,
    });

    // Set first_response_at
    await supabase.from('tickets').update({
      first_response_at: new Date().toISOString(),
      status: 'In Progress',
    }).eq('id', ticketId);
  }

  // Get SPOC routing (this reads from DB so admin changes take effect immediately)
  const routing = await getSpocRouting(input.category, input.sub_category);

  // The Slack alert with SPOC tags is handled by pg_net trigger
  // But we need to store the routing info for the enhanced trigger
  // We'll use a ticket metadata approach — store routing in a comment
  // Actually, the pg_net trigger already fires on INSERT, so we enhance it
  // to query spoc_assignments directly. See Step 4 SQL below.
}

export async function postMessage(ticketId: number, body: string) {
  if (!body.trim()) return { error: 'Message cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found.' };

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