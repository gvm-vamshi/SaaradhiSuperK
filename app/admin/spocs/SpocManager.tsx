'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, UserCog } from 'lucide-react';
import { addSpoc, removeSpoc, toggleSpoc } from './actions';

interface Role {
  id: number;
  role_key: string;
  role_name: string;
  triggers: string;
}

interface Assignment {
  id: number;
  role_id: number;
  person_name: string;
  slack_email: string;
  active: boolean;
  spoc_roles: { role_name: string; role_key: string };
}

export function SpocManager({ roles, assignments }: { roles: Role[]; assignments: Assignment[] }) {
  const [showAdd, setShowAdd] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAdd = (roleId: number) => {
    if (!name.trim() || !email.trim()) return;
    setError('');
    startTransition(async () => {
      const res = await addSpoc(roleId, name.trim(), email.trim());
      if (res?.error) setError(res.error);
      else { setShowAdd(null); setName(''); setEmail(''); router.refresh(); }
    });
  };

  const handleRemove = (id: number) => {
    startTransition(async () => {
      await removeSpoc(id);
      router.refresh();
    });
  };

  const handleToggle = (id: number, active: boolean) => {
    startTransition(async () => {
      await toggleSpoc(id, !active);
      router.refresh();
    });
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <UserCog size={20} className="text-slate-700" />
        <div>
          <div className="font-semibold text-lg">SPOC Management</div>
          <div className="text-sm text-slate-500">Manage who gets tagged on Slack when tickets are raised. Changes take effect immediately.</div>
        </div>
      </div>

      {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded mb-4">{error}</div>}

      <div className="space-y-4">
        {roles.map(role => {
          const roleAssignments = assignments.filter(a => a.role_id === role.id);
          return (
            <div key={role.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <Users size={16} /> {role.role_name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{role.triggers}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{roleAssignments.filter(a => a.active).length} active</span>
                    <button
                      onClick={() => setShowAdd(showAdd === role.id ? null : role.id)}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {roleAssignments.map(a => (
                  <div key={a.id} className={`px-5 py-3 flex items-center justify-between ${!a.active ? 'opacity-50' : ''}`}>
                    <div>
                      <div className="font-medium text-sm text-slate-900">{a.person_name}</div>
                      <div className="text-xs text-slate-500">{a.slack_email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(a.id, a.active)}
                        disabled={isPending}
                        className={`text-xs px-3 py-1 rounded-full ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {a.active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleRemove(a.id)}
                        disabled={isPending}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {roleAssignments.length === 0 && (
                  <div className="px-5 py-4 text-sm text-slate-500 text-center">No SPOCs assigned to this role.</div>
                )}
              </div>

              {showAdd === role.id && (
                <div className="px-5 py-4 bg-red-50 border-t border-red-200">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600">Name</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Koushal"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600">Slack Email</label>
                      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. koushal@superk.in"
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <button onClick={() => handleAdd(role.id)} disabled={isPending}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:bg-slate-300">
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}