'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  let email      = String(formData.get('email')    || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Username/email and password are required.' };
  }

  // If no '@', assume username for an SP and append the synthetic domain
  if (!email.includes('@')) {
    email = `${email}@superk.in`;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Session not established.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();

  const home = profile?.role === 'admin' ? '/admin'
            : profile?.role === 'agent' ? '/agent'
            : '/sp';

  redirect(home);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}