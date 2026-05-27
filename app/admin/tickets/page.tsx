import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield } from 'lucide-react';
import { priorityColor, statusColor, formatDate, type Ticket } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminAllTickets() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tickets')
    .select('*, stores(name), assigned:profiles!tickets_assigned_to_fkey(full_name)')
    .order('created_at', { ascending: false }) as unknown as { data: (Ticket & { stores: { name: string } | null; assigned: { full_name: string } | null })[] };

  const tickets = data || [];

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 font-semibold">All tickets ({tickets.length})</div>
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
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No tickets yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}