import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { TicketDetail } from '@/app/components/TicketDetail';
import { Headphones } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Ticket, TicketMessage, Store } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AgentTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) notFound();

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from('tickets').select('*, stores(name)').eq('id', ticketId).single() as unknown as { data: (Ticket & { stores: Store | null }) | null };
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

  return (
    <Shell title="Agent Console" icon={<Headphones size={20}/>} accent="violet">
      <TicketDetail
        ticket={ticket}
        messages={messages || []}
        senderNames={senderNames}
        storeName={ticket.stores?.name ?? ticket.store_code}
        backHref="/agent"
        canManage={true}
      />
    </Shell>
  );
}