'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signIn(formData: FormData) {
  const email    = String(formData.get('email')    || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // After a successful sign-in, fetch the user's role and redirect to the right home.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Session not established.' };

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();

  const home = profile?.role === 'admin' ? '/admin'
            : profile?.role === 'agent' ? '/agent'
            : '/sp';

  revalidatePath('/', 'layout');
  redirect(home);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
