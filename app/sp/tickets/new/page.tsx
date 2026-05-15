import { createClient } from '@/lib/supabase/server';
import { Shell } from '@/app/components/Shell';
import { User } from 'lucide-react';
import { NewTicketWizard } from './NewTicketWizard';
import type { Category, KbEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NewTicketPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: kb }] = await Promise.all([
    supabase.from('categories').select('*').eq('active', true).order('category').order('sub_category'),
    supabase.from('knowledge_base').select('*').eq('status', 'Active'),
  ]);

  return (
    <Shell title="Store Partner" icon={<User size={20}/>} accent="red">
      <NewTicketWizard
        categories={(categories || []) as Category[]}
        kb={(kb || []) as KbEntry[]}
      />
    </Shell>
  );
}
