import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { AdminTabs } from '../AdminTabs';
import { Shield } from 'lucide-react';
import { SpocManager } from './SpocManager';

export const dynamic = 'force-dynamic';

export default async function AdminSpocs() {
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from('spoc_roles').select('*').order('id');

  const { data: assignments } = await supabase
    .from('spoc_assignments').select('*, spoc_roles(role_name, role_key)').order('role_id');

  return (
    <Shell title="Admin Dashboard" icon={<Shield size={20} />} accent="slate">
      <AdminTabs />
      <SpocManager roles={roles || []} assignments={assignments || []} />
    </Shell>
  );
}