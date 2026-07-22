import { createClient } from '@/lib/supabase/server';

export interface SpocInfo {
  role_name: string;
  person_name: string;
  slack_email: string;
}

export interface RoutingResult {
  spocs: SpocInfo[];
  tasks: string[];
  slack_mentions: string;
}

export async function getSpocRouting(category: string, subCategory: string): Promise<RoutingResult> {
  const supabase = await createClient();

  // Get mappings for this category + sub_category
  const { data: mappings } = await supabase
    .from('category_spoc_mapping')
    .select('spoc_role_key, task_checklist')
    .or(`and(category.eq.${category},sub_category.eq.${subCategory}),and(category.eq.${category},sub_category.eq.Other)`);

  if (!mappings || mappings.length === 0) {
    // Fallback to central SPOC
    const { data: central } = await supabase
      .from('spoc_assignments')
      .select('person_name, slack_email, spoc_roles(role_name)')
      .eq('active', true)
      .eq('role_id', (await supabase.from('spoc_roles').select('id').eq('role_key', 'central').single()).data?.id);

    return {
      spocs: (central || []).map(c => ({
        role_name: (c.spoc_roles as any)?.role_name || 'Central',
        person_name: c.person_name,
        slack_email: c.slack_email,
      })),
      tasks: ['Review issue details', 'Route to appropriate team', 'Update SP'],
      slack_mentions: (central || []).map(c => c.slack_email).join(', '),
    };
  }

  // Collect unique role keys and tasks
  const roleKeys = [...new Set(mappings.map(m => m.spoc_role_key))];
  const allTasks: string[] = [];
  for (const m of mappings) {
    if (m.task_checklist) {
      for (const t of m.task_checklist) {
        if (!allTasks.includes(t)) allTasks.push(t);
      }
    }
  }

  // Always add SLA tasks
  allTasks.push('Acknowledge ticket within 48 hrs (SLA 1)');
  allTasks.push('Resolve within 7 days (SLA 2)');

  // Get active SPOC people for these roles
  const { data: roleIds } = await supabase
    .from('spoc_roles')
    .select('id, role_name, role_key')
    .in('role_key', roleKeys);

  const ids = (roleIds || []).map(r => r.id);
  const { data: people } = await supabase
    .from('spoc_assignments')
    .select('person_name, slack_email, role_id')
    .in('role_id', ids)
    .eq('active', true);

  const spocs: SpocInfo[] = (people || []).map(p => {
    const role = (roleIds || []).find(r => r.id === p.role_id);
    return {
      role_name: role?.role_name || 'Support',
      person_name: p.person_name,
      slack_email: p.slack_email,
    };
  });

  // Deduplicate by email
  const seen = new Set<string>();
  const uniqueSpocs = spocs.filter(s => {
    if (seen.has(s.slack_email)) return false;
    seen.add(s.slack_email);
    return true;
  });

  return {
    spocs: uniqueSpocs,
    tasks: allTasks,
    slack_mentions: uniqueSpocs.map(s => s.slack_email).join(', '),
  };
}