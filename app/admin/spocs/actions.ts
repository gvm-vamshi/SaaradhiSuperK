'use server';

import { createClient } from '@/lib/supabase/server';

export async function addSpoc(roleId: number, name: string, slackEmail: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Admin only.' };

  const { error } = await supabase.from('spoc_assignments').insert({
    role_id: roleId,
    person_name: name,
    slack_email: slackEmail,
    active: true,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function removeSpoc(id: number) {
  const supabase = await createClient();
  await supabase.from('spoc_assignments').delete().eq('id', id);
  return { ok: true };
}

export async function toggleSpoc(id: number, active: boolean) {
  const supabase = await createClient();
  await supabase.from('spoc_assignments').update({ active }).eq('id', id);
  return { ok: true };
}
