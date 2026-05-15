'use client';

import { useState, useTransition } from 'react';
import { ShoppingBag, User, Shield, Headphones } from 'lucide-react';
import { signIn } from './actions';

export function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    setError('');
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    });
  };

  const quick = (em: string, pw: string) => { setEmail(em); setPassword(pw); setError(''); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Brand panel */}
        <div className="text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-3 rounded-xl"><ShoppingBag size={28}/></div>
            <div>
              <div className="text-3xl font-bold tracking-tight">SuperK</div>
              <div className="text-emerald-300 text-sm">Store Partner Support</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold leading-tight">Faster answers.<br/>Fewer ASM calls.</h1>
          <p className="text-slate-300 leading-relaxed">A unified help desk for every SuperK store partner. Get instant answers from our knowledge base, or raise a ticket and watch it route to the right team.</p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            <Stat n="80%"  l="Queries auto-resolved" />
            <Stat n="<15m" l="First response SLA" />
            <Stat n="24/7" l="Always available" />
          </div>
        </div>

        {/* Login panel */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <div className="text-sm text-slate-500 font-medium">Welcome back</div>
            <div className="text-2xl font-bold text-slate-900">Sign in to continue</div>
          </div>

          <form action={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="ramesh@superk.in"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Password</label>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded">{error}</div>}
            <button
              type="submit" disabled={isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition"
            >
              {isPending ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Demo accounts — click to fill</div>
            <div className="grid grid-cols-3 gap-2">
              <DemoBtn icon={<User       size={14}/>} label="Store Partner" onClick={() => quick('ramesh@superk.in', 'Welcome@123')} />
              <DemoBtn icon={<Headphones size={14}/>} label="Agent"          onClick={() => quick('karthik@superk.in', 'Agent@123')} />
              <DemoBtn icon={<Shield     size={14}/>} label="Admin"          onClick={() => quick('admin@superk.in',  'Admin@123')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/10">
      <div className="text-2xl font-bold text-emerald-300">{n}</div>
      <div className="text-xs text-slate-300">{l}</div>
    </div>
  );
}

function DemoBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 p-2 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-emerald-300 transition text-slate-700">
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
