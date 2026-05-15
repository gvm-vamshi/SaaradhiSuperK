import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield } from 'lucide-react';
import type { Profile, Store } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminUsers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*, stores(name)')
    .order('role')
    .order('full_name') as unknown as { data: (Profile & { stores: Store | null })[] };

  const all = data || [];
  const sps    = all.filter(u => u.role === 'sp');
  const agents = all.filter(u => u.role === 'agent');
  const admins = all.filter(u => u.role === 'admin');

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold">Store Partners ({sps.length})</div>
          <div className="divide-y divide-slate-100">
            {sps.map(u => (
              <div key={u.id} className="px-6 py-3 flex justify-between">
                <div>
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-slate-500">{u.store_code} · {u.stores?.name ?? '—'}</div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full self-center">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 font-semibold">Help Desk Agents ({agents.length})</div>
          <div className="divide-y divide-slate-100">
            {agents.map(u => (
              <div key={u.id} className="px-6 py-3 flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-slate-500 truncate">{u.team}</div>
                </div>
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full self-center flex-shrink-0">
                  {(u.categories_handled || []).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {admins.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 md:col-span-2">
            <div className="px-6 py-4 border-b border-slate-100 font-semibold">Admins ({admins.length})</div>
            <div className="divide-y divide-slate-100">
              {admins.map(u => (
                <div key={u.id} className="px-6 py-3 flex justify-between">
                  <div>
                    <div className="font-medium">{u.full_name}</div>
                  </div>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full self-center">Admin</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}