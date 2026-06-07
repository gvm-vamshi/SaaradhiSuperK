'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Phone, UserCog } from 'lucide-react';
import { priorityColor, statusColor, formatDate, type Ticket, type TicketMessage, type TicketStatus } from '@/lib/types';
import { postMessage, updateTicketStatus } from '@/app/sp/tickets/actions';
import { reassignTicket } from '@/app/admin/routing/actions';

interface Props {
  ticket: Ticket;
  messages: TicketMessage[];
  senderNames: Record<string, string>;
  storeName: string;
  storePhone?: string | null;
  backHref: string;
  canManage?: boolean;
  hidePriority?: boolean;
  agents?: { id: string; full_name: string }[];
  assignedName?: string;
}

function pendingAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

export function TicketDetail({ ticket, messages, senderNames, storeName, storePhone, backHref, canManage, hidePriority, agents, assignedName }: Props) {
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const send = () => {
    if (!reply.trim()) return;
    setError('');
    startTransition(async () => {
      const res = await postMessage(ticket.id, reply);
      if (res && 'error' in res) setError(res.error || 'Failed to send.');
      else { setReply(''); router.refresh(); }
    });
  };

  const changeStatus = (status: TicketStatus) => {
    startTransition(async () => {
      const res = await updateTicketStatus(ticket.id, status);
      if (res && 'error' in res) setError(res.error || 'Failed to update.');
      else router.refresh();
    });
  };

  const handleReassign = (agentId: string) => {
    if (!agentId) return;
    setError('');
    startTransition(async () => {
      const res = await reassignTicket(ticket.id, agentId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const closed = ticket.status === 'Resolved';
  const isStillPending = ticket.status !== 'Resolved' && ticket.status !== 'Closed';

  const displayName = (m: TicketMessage) => {
    if (m.sender_role === 'sp') {
      return senderNames[m.sender_id] || 'Store Partner';
    }
    if (hidePriority) {
      return 'Mitra - Agent';
    }
    return senderNames[m.sender_id] || m.sender_role;
  };

  return (
    <div>
      <Link href={backHref} className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Back</Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="font-mono text-xs text-slate-500">{ticket.ticket_code}</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {ticket.category} · {ticket.other_title ? `Other: ${ticket.other_title}` : ticket.sub_category}
                </div>
              </div>
              <div className="flex gap-2">
                {!hidePriority && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${priorityColor(ticket.priority)}`}>{ticket.priority}</span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor(ticket.status)}`}>{ticket.status}</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-slate-700 whitespace-pre-line">{ticket.description}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><MessageSquare size={18}/> Conversation</div>
            <div className="space-y-3 mb-4">
              {messages.length === 0 && <div className="text-sm text-slate-500 text-center py-4">No messages yet.</div>}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === 'sp' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md rounded-lg p-3 ${m.sender_role === 'sp' ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-900'}`}>
                    <div className="text-xs font-semibold mb-1 opacity-70">{displayName(m)} · {formatDate(m.created_at)}</div>
                    <div className="text-sm whitespace-pre-line">{m.body}</div>
                  </div>
                </div>
              ))}
            </div>
            {!closed && (
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Type a reply…"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  disabled={isPending}
                />
                <button onClick={send} disabled={isPending || !reply.trim()} className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-4 rounded-lg">
                  <Send size={16}/>
                </button>
              </div>
            )}
            {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded mt-2">{error}</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="font-semibold text-slate-900 mb-3">Details</div>
            <Detail k="Store"          v={`${storeName} (${ticket.store_code})`}/>
            {canManage && storePhone && (
              <div className="py-2 border-b border-slate-100">
                <div className="text-xs text-slate-500">Store contact</div>
                <a href={`tel:${storePhone}`} className="text-sm text-red-700 font-medium hover:underline flex items-center gap-1.5 mt-0.5">
                  <Phone size={14}/> {storePhone}
                </a>
              </div>
            )}
            {canManage && assignedName && (
              <Detail k="Assigned to" v={assignedName}/>
            )}
            <Detail k="Created"        v={formatDate(ticket.created_at)}/>
            {canManage && isStillPending && (
              <div className="py-2 border-b border-slate-100">
                <div className="text-xs text-slate-500">Pending since</div>
                <div className="text-sm text-orange-700 font-semibold">⏱ {pendingAge(ticket.created_at)}</div>
              </div>
            )}
            <Detail k="First response" v={formatDate(ticket.first_response_at)}/>
            <Detail k="Resolved"       v={formatDate(ticket.resolved_at)}/>
          </div>

          {/* Reassign — only if agents list is passed (admin view) */}
          {canManage && agents && agents.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><UserCog size={16}/> Reassign</div>
              <select
                defaultValue=""
                onChange={e => handleReassign(e.target.value)}
                disabled={isPending}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="" disabled>Select agent…</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name}{a.id === ticket.assigned_to ? ' (current)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {canManage && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="font-semibold text-slate-900 mb-3">Actions</div>
              <div className="space-y-2">
                <button onClick={() => changeStatus('In Progress')} disabled={isPending || ticket.status === 'In Progress'}
                  className="w-full text-sm bg-violet-100 hover:bg-violet-200 disabled:opacity-50 text-violet-700 font-medium py-2 rounded-lg">
                  Mark In Progress
                </button>
                <button onClick={() => changeStatus('Resolved')} disabled={isPending || ticket.status === 'Resolved'}
                  className="w-full text-sm bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 text-emerald-700 font-medium py-2 rounded-lg">
                  Mark Resolved
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="text-sm text-slate-900 font-medium">{v}</div>
    </div>
  );
}