'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Store, Ticket, BookOpen, Users } from 'lucide-react';

const TABS = [
  { href: '/admin',          label: 'Dashboard',      icon: <BarChart3 size={14}/> },
  { href: '/admin/stores',   label: 'Stores',         icon: <Store size={14}/> },
  { href: '/admin/tickets',  label: 'All Tickets',    icon: <Ticket size={14}/> },
  { href: '/admin/kb',       label: 'Knowledge Base', icon: <BookOpen size={14}/> },
  { href: '/admin/users',    label: 'Users',          icon: <Users size={14}/> },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6 flex-wrap">
      {TABS.map(t => {
        // active if path matches exactly OR (for non-dashboard tabs) starts with the href
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md ${active ? 'bg-white shadow font-medium text-slate-900' : 'text-slate-600'}`}>
            {t.icon} {t.label}
          </Link>
        );
      })}
    </div>
  );
}
