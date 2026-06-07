import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield } from 'lucide-react';
import { RoutingToggles } from './RoutingToggles';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminRouting() {
  const supabase = await createClient();

  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name, routing_active')
    .eq('role', 'agent')
    .order('full_name') as unknown as { data: (Profile & { routing_active: boolean })[] };

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20}/>} accent="slate">
      <AdminTabs/>
      <RoutingToggles agents={agents || []} />
    </Shell>
  );
}