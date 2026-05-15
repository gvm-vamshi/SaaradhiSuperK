'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TicketStatus } from '@/lib/types';

// ============================================================
// createTicket — called by the SP new-ticket wizard
// ============================================================
export async function createTicket(input: {
  category: string;
  sub_category: string;
  other_title: string | null;
  description: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  // Get profile for store_code
  const { data: profile } = await supabase
    .from('profiles').select('store_code').eq('id', user.id).single();
  if (!profile?.store_code) return { error: 'No store assigned to this account.' };

  // Look up the category to get default_priority and routing
  const { data: cat } = await supabase
    .from('categories')
    .select('default_priority, routed_to_team')
    .eq('category', input.category)
    .eq('sub_category', input.sub_category)
    .maybeSingle();

  // Find an agent that handles this category for auto-assignment
  // (RLS allows SP to insert; assigned_to is set server-side to the first matching agent)
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, categories_handled')
    .eq('role', 'agent')
    .eq('active', true);

  const assignedTo = agents?.find(a =>
    Array.isArray(a.categories_handled) && a.categories_handled.includes(input.category)
  )?.id ?? null;

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

  revalidatePath('/sp');
  revalidatePath('/sp/tickets');
  redirect(`/sp/tickets/${created.id}`);
}

// ============================================================
// postMessage — SP or Agent posts a reply on a ticket
// ============================================================
export async function postMessage(ticketId: number, body: string) {
  if (!body.trim()) return { error: 'Message cannot be empty.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return { error: 'Profile not found.' };

  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_role: profile.role,
    body: body.trim(),
  });

  if (error) return { error: error.message };

  revalidatePath(`/sp/tickets/${ticketId}`);
  revalidatePath(`/agent/tickets/${ticketId}`);
  return { ok: true };
}

// ============================================================
// updateTicketStatus — Agent or Admin updates status
// ============================================================
export async function updateTicketStatus(ticketId: number, status: TicketStatus) {
  const supabase = await createClient();

  const patch: Record<string, unknown> = { status };
  if (status === 'Resolved') patch.resolved_at = new Date().toISOString();
  if (status === 'In Progress') {
    // ensure first_response_at is set
    const { data: t } = await supabase
      .from('tickets').select('first_response_at').eq('id', ticketId).single();
    if (!t?.first_response_at) patch.first_response_at = new Date().toISOString();
  }

  const { error } = await supabase.from('tickets').update(patch).eq('id', ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/agent/tickets/${ticketId}`);
  revalidatePath(`/sp/tickets/${ticketId}`);
  revalidatePath('/agent');
  revalidatePath('/admin');
  return { ok: true };
}
