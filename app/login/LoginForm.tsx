'use client';

import { useState, useTransition } from 'react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Brand panel */}
        <div className="text-white space-y-6">
          <div className="flex items-center gap-3">
            <img src="/superk-logo.png" alt="SuperK" className="w-14 h-14 rounded-xl shadow-lg" />
            <div>
              <div className="text-3xl font-bold tracking-tight">SuperK Mitra</div>
              <div className="text-red-300 text-sm">Store Partner Support · స్టోర్ పార్ట్‌నర్ మద్దతు</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Faster answers.<br/>Fewer ASM calls.
            <span className="block text-2xl font-semibold text-red-200 mt-3">వేగవంతమైన సమాధానాలు. తక్కువ ASM కాల్‌లు.</span>
          </h1>
          <p className="text-slate-300 leading-relaxed">
            Support portal for Store Partners.
            <span className="block text-slate-400 text-sm mt-1">స్టోర్ పార్ట్‌నర్ల కోసం మద్దతు పోర్టల్.</span>
          </p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Stat n="Priority"  l="Resolution" te="ప్రాధాన్యత పరిష్కారం" />
            <Stat n="Dedicated" l="Support"    te="అంకిత మద్దతు" />
          </div>
        </div>

        {/* Login panel */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <div className="text-sm text-slate-500 font-medium">Welcome back · తిరిగి స్వాగతం</div>
            <div className="text-2xl font-bold text-slate-900">Sign in to continue</div>
            <div className="text-sm text-slate-600">కొనసాగడానికి సైన్ ఇన్ చేయండి</div>
          </div>

          <form action={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Username or Email · యూజర్‌నేమ్ లేదా ఇమెయిల్
              </label>
              <input
                id="email" name="email" type="text" autoComplete="username" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                placeholder="store01"
              />
              <div className="text-xs text-slate-500 mt-1">Store Partners: type your store username (e.g. store01)</div>
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Password · పాస్‌వర్డ్
              </label>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <div className="text-rose-600 text-sm bg-rose-50 p-2 rounded">{error}</div>}
            <button
              type="submit" disabled={isPending}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition"
            >
              {isPending ? 'Signing in…' : 'Sign In · సైన్ ఇన్'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l, te }: { n: string; l: string; te: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-lg p-3 border border-white/10">
      <div className="text-xl font-bold text-red-300">{n}</div>
      <div className="text-xs text-slate-300">{l}</div>
      <div className="text-xs text-slate-400 mt-0.5">{te}</div>
    </div>
  );
}