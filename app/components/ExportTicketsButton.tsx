'use client';

import { Download } from 'lucide-react';

/**
 * Export-all-tickets button. Drops into the admin and agent ticket pages.
 * It links to /api/tickets/export, which streams a CSV scoped by RLS
 * (admin = all tickets, agent = their queue).
 *
 * Optionally pass the current filters so the export matches what's on screen:
 *   <ExportTicketsButton filters={{ status, category, store, q }} />
 */
export function ExportTicketsButton({
  filters,
}: {
  filters?: { status?: string; category?: string; store?: string; q?: string };
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.store) params.set('store', filters.store);
  if (filters?.q) params.set('q', filters.q);
  const href = '/api/tickets/export' + (params.toString() ? `?${params}` : '');

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700"
    >
      <Download size={16} /> Export CSV
    </a>
  );
}