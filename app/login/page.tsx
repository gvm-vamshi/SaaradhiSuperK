import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already signed in, bounce to the appropriate home
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();

    if (profile?.role === 'admin') redirect('/admin');
    if (profile?.role === 'agent') redirect('/agent');
    redirect('/sp');
  }

  return <LoginForm />;
}
