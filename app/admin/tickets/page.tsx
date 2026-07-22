import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield } from 'lucide-react';
import { priorityColor, statusColor, formatDate, type Ticket } from '@/lib/types';
import Link from 'next/link';
import { TicketFilters } from './TicketFilters';

export const dynamic = 'force-dynamic';

export default async function AdminAllTickets({ searchParams }: { searchParams: Promise<{ store?: string; priority?: string; category?: string; status?: string; search?: string }> }) {
  const { store = '', priority = '', category = '', status = '', search = '' } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from('tickets')
    .select('*, stores(name), assigned:profiles!tickets_assigned_to_fkey(full_name)')
    .order('created_at', { ascending: false }) as unknown as { data: (Ticket & { stores: { name: string } | null; assigned: { full_name: string } | null })[] };

  const allTickets = data || [];

  const storeNames = [...new Set(allTickets.map(t => t.stores?.name || t.store_code))].sort();
  const categories = [...new Set(allTickets.map(t => t.category))].sort();
  const priorities = ['Critical', 'High', 'Medium', 'Low'];
  const statuses = ['Open', 'In Progress', 'Resolved'];

  let tickets = allTickets;
  if (store)    tickets = tickets.filter(t => (t.stores?.name || t.store_code) === store);
  if (priority) tickets = tickets.filter(t => t.priority === priority);
  if (category) tickets = tickets.filter(t => t.category === category);
  if (status)   tickets = tickets.filter(t => t.status === status);
  if (search) {
    const q = search.toLowerCase();
    tickets = tickets.filter(t =>
      t.ticket_code.toLowerCase().includes(q) ||
      (t.stores?.name || '').toLowerCase().includes(q) ||
      t.store_code.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.sub_category.toLowerCase().includes(q) ||
      (t.other_title || '').toLowerCase().includes(q)
    );
  }

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20} />} accent="slate">
      <AdminTabs />
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">All tickets ({tickets.length}{tickets.length !== allTickets.length ? ` of ${allTickets.length}` : ''})</div>
          </div>
          <TicketFilters
            storeNames={storeNames}
            categories={categories}
            priorities={priorities}
            statuses={statuses}
            currentStore={store}
            currentPriority={priority}
            currentCategory={category}
            currentStatus={status}
            currentSearch={search}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Store</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Assigned</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/admin/tickets/${t.id}`} className="font-mono text-xs text-red-700 hover:underline">{t.ticket_code}</Link></td>
                  <td className="px-4 py-3">{t.stores?.name ?? t.store_code}</td>
                  <td className="px-4 py-3">{t.category} · {t.other_title ? `Other: ${t.other_title}` : t.sub_category}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{t.status}</span></td>
                  <td className="px-4 py-3">{t.assigned?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(t.created_at)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No tickets match filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}