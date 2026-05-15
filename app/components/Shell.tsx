'use client';

import { LogOut } from 'lucide-react';
import { signOut } from '@/app/login/actions';

interface ShellProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'emerald' | 'violet' | 'slate';
  children: React.ReactNode;
}

export function Shell({ title, subtitle, icon, accent = 'emerald', children }: ShellProps) {
  const accentBg = { emerald: 'bg-emerald-600', violet: 'bg-violet-600', slate: 'bg-slate-800' }[accent];
  return (
    <div className="min-h-screen bg-slate-50">
      <header className={`${accentBg} text-white shadow-md`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">{icon}</div>
            <div>
              <div className="font-bold text-lg leading-tight">SuperK · {title}</div>
              {subtitle && <div className="text-xs opacity-80">{subtitle}</div>}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
            >
              <LogOut size={16}/> Logout
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
