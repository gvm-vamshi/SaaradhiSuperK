import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { TicketDetail } from '@/app/components/TicketDetail';
import { Shield } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Ticket, TicketMessage, Store, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) notFound();

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from('tickets').select('*, stores(name, phone)').eq('id', ticketId).single() as unknown as { data: (Ticket & { stores: Store | null }) | null };
  if (!ticket) notFound();

  const { data: messages } = await supabase
    .from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at') as unknown as { data: TicketMessage[] };

  const senderIds = Array.from(new Set((messages || []).map(m => m.sender_id)));
  const senderNames: Record<string, string> = {};
  if (senderIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles').select('id, full_name').in('id', senderIds);
    for (const p of profs || []) senderNames[p.id] = p.full_name;
  }

  // Fetch all agents for reassign dropdown
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'agent')
    .order('full_name') as unknown as { data: Pick<Profile, 'id' | 'full_name'>[] };

  // Get current assigned agent name
  const assignedName = ticket.assigned_to
    ? (agents || []).find(a => a.id === ticket.assigned_to)?.full_name ?? 'Unknown'
    : 'Unassigned';

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <TicketDetail
        ticket={ticket}
        messages={messages || []}
        senderNames={senderNames}
        storeName={ticket.stores?.name ?? ticket.store_code}
        storePhone={ticket.stores?.phone}
        backHref="/admin/tickets"
        canManage={true}
        agents={agents || []}
        assignedName={assignedName}
      />
    </Shell>
  );
}