import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield } from 'lucide-react';
import type { KbEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminKb() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('knowledge_base').select('*').order('id') as unknown as { data: KbEntry[] };
  const kb = data || [];

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-semibold">Knowledge base ({kb.length} entries)</div>
          <div className="text-xs text-slate-500">Add new entries via SQL or the future admin form</div>
        </div>
        <div className="divide-y divide-slate-100">
          {kb.map(k => (
            <div key={k.id} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs text-slate-500">KB-{String(k.id).padStart(3, '0')}</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{k.category} · {k.sub_category}</span>
                {k.owner && <span className="text-xs text-slate-500">· {k.owner}</span>}
              </div>
              <div className="font-medium text-slate-900">{k.question}</div>
              <div className="text-sm text-slate-600 whitespace-pre-line mt-1">{k.answer}</div>
              {k.keywords && <div className="text-xs text-slate-400 mt-1">Keywords: {k.keywords}</div>}
            </div>
          ))}
          {kb.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">No KB entries yet.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}