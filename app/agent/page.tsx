import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shell, KpiCard } from '@/app/components/Shell';
import { Headphones, Ticket as TicketIcon, Clock, TrendingUp, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import { priorityColor, statusColor, type Ticket, type Profile, type TicketMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

function pendingDays(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function pendingColor(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days > 7) return 'bg-rose-100 text-rose-700';
  if (days > 3) return 'bg-orange-100 text-orange-700';
  if (days > 1) return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

export default async function AgentHome({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter = 'mine' } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user!.id).single() as unknown as { data: Profile };

  const { data: queue } = await supabase
    .from('tickets')
    .select('*, stores(name, phone)')
    .order('created_at', { ascending: false }) as unknown as { data: (Ticket & { stores: { name: string; phone: string | null } | null })[] };

  const all = queue || [];

  // Fetch last message per ticket to determine "awaiting response"
  const ticketIds = all.map(t => t.id);
  let lastMessages: Record<number, TicketMessage> = {};
  if (ticketIds.length > 0) {
    const { data: msgs } = await supabase
      .from('ticket_messages')
      .select('*')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false }) as unknown as { data: TicketMessage[] };

    // Get the latest message per ticket
    for (const m of (msgs || [])) {
      if (!lastMessages[m.ticket_id]) {
        lastMessages[m.ticket_id] = m;
      }
    }
  }

  // A ticket needs response if: not resolved AND (last message is from SP OR no messages at all)
  const needsResponse = (t: Ticket) => {
    if (t.status === 'Resolved' || t.status === 'Closed') return false;
    const last = lastMessages[t.id];
    if (!last) return true; // no messages = needs first response
    return last.sender_role === 'sp';
  };

  const mine = all.filter(t => t.assigned_to === user!.id);
  const open = all.filter(t => t.status === 'Open');
  const inProgress = all.filter(t => t.status === 'In Progress');
  const resolved = all.filter(t => t.status === 'Resolved');
  const awaiting = all.filter(t => needsResponse(t));

  let list = all;
  if (filter === 'mine')        list = mine;
  if (filter === 'open')        list = open;
  if (filter === 'inprogress')  list = inProgress;
  if (filter === 'resolved')    list = resolved;
  if (filter === 'awaiting')    list = awaiting;

  const filters = [
    ['awaiting',   '⚠ Awaiting',  awaiting.length],
    ['mine',       'Mine',         mine.length],
    ['open',       'Open',         open.length],
    ['inprogress', 'In Progress',  inProgress.length],
    ['resolved',   'Resolved',     resolved.length],
    ['all',        'All',          all.length],
  ];

  return (
    <Shell title="Agent Console" subtitle={`${profile.full_name} · ${profile.team ?? ''}`} icon={<Headphones size={20}/>} accent="violet">
      <div className="grid md:grid-cols-5 gap-4 mb-6">
        <Link href="/agent?filter=awaiting">
          <KpiCard icon={<MessageCircle className="text-rose-600"/>} label="Awaiting Response" value={awaiting.length} />
        </Link>
        <Link href="/agent?filter=mine">
          <KpiCard icon={<TicketIcon className="text-violet-600"/>} label="Assigned to me" value={mine.length} />
        </Link>
        <Link href="/agent?filter=open">
          <KpiCard icon={<Clock className="text-orange-600"/>} label="Open" value={open.length} />
        </Link>
        <Link href="/agent?filter=inprogress">
          <KpiCard icon={<TrendingUp className="text-blue-600"/>} label="In Progress" value={inProgress.length} />
        </Link>
        <Link href="/agent?filter=resolved">
          <KpiCard icon={<CheckCircle2 className="text-emerald-600"/>} label="Resolved" value={resolved.length} />
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="font-semibold">Tickets — {profile.team}</div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
            {filters.map(([k, l, count]) => (
              <Link key={k as string} href={`/agent?filter=${k}`}
                className={`text-sm px-3 py-1 rounded-md ${filter === k ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-600'}`}>
                {l as string} ({count as number})
              </Link>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {list.map(t => {
            const isPending = t.status !== 'Resolved' && t.status !== 'Closed';
            const awaitingReply = needsResponse(t);
            return (
              <div key={t.id} className={`px-6 py-4 hover:bg-slate-50 ${awaitingReply ? 'border-l-4 border-l-rose-500' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/agent/tickets/${t.id}`} className="flex-1 min-w-0 block">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{t.ticket_code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                      {awaitingReply && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">💬 Awaiting Response</span>
                      )}
                      {isPending && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pendingColor(t.created_at)}`}>
                          ⏱ {pendingDays(t.created_at)}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">· {t.stores?.name}</span>
                    </div>
                    <div className="font-medium text-slate-900">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</div>
                    <div className="text-sm text-slate-500 truncate">{t.description}</div>
                  </Link>
                  {t.stores?.phone && (
                    <a href={`tel:${t.stores.phone}`}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium px-3 py-1.5 rounded-lg"
                      title={`Call ${t.stores.name}`}>
                      <Phone size={12}/> {t.stores.phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="p-8 text-center text-slate-500">No tickets in this view.</div>}
        </div>
      </div>
    </Shell>
  );
}