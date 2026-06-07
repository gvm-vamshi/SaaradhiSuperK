'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { toggleAgentRouting } from './actions';

interface Agent {
  id: string;
  full_name: string;
  routing_active: boolean;
}

export function RoutingToggles({ agents }: { agents: Agent[] }) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (agentId: string, currentState: boolean) => {
    setError('');
    startTransition(async () => {
      const res = await toggleAgentRouting(agentId, !currentState);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  const activeCount = agents.filter(a => a.routing_active).length;

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2"><Users size={18}/> Ticket Routing</div>
            <div className="text-sm text-slate-500 mt-1">Toggle which agents receive auto-assigned tickets. Round-robin runs across active agents only.</div>
          </div>
          <div className="bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg">
            {activeCount} of {agents.length} active
          </div>
        </div>

        {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded mb-4">{error}</div>}

        <div className="space-y-3">
          {agents.map(a => (
            <div key={a.id} className={`flex items-center justify-between p-4 rounded-lg border ${a.routing_active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div>
                <div className="font-medium text-slate-900">{a.full_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{a.routing_active ? '✓ Receiving tickets' : '✗ Not receiving tickets'}</div>
              </div>
              <button
                onClick={() => toggle(a.id, a.routing_active)}
                disabled={isPending}
                className="flex-shrink-0"
                title={a.routing_active ? 'Deactivate' : 'Activate'}
              >
                {a.routing_active
                  ? <ToggleRight size={36} className="text-emerald-600"/>
                  : <ToggleLeft size={36} className="text-slate-400"/>
                }
              </button>
            </div>
          ))}
          {agents.length === 0 && <div className="text-sm text-slate-500 text-center py-4">No agents found.</div>}
        </div>

        {activeCount === 0 && agents.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ No agents are active. New tickets will be created without assignment until at least one agent is toggled on.
          </div>
        )}
      </div>
    </div>
  );
}