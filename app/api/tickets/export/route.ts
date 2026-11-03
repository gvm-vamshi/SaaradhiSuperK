// app/api/tickets/export/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type TicketRow = Record<string, any> & {
  stores?: { name?: string | null; phone?: string | null; asm_owner?: string | null } | null;
};

function csvCell(v: any): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // flatten newlines inside a cell so rows don't break
  s = s.replace(/\r?\n/g, ' ');
  if (/[",]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const sp = req.nextUrl.searchParams;

  // RLS scopes rows to what this user may see (admin = all, agent = their queue).
  let q = supabase
    .from('tickets')
    .select('*, stores(name, phone, asm_owner)')
    .order('created_at', { ascending: false });

  // Optional filters (pass the same ones the list page uses)
  const status = sp.get('status');
  const category = sp.get('category');
  const store = sp.get('store'); // store_code
  const search = sp.get('q');
  if (status) q = q.eq('status', status);
  if (category) q = q.eq('category', category);
  if (store) q = q.eq('store_code', store);
  if (search) q = q.ilike('description', `%${search}%`);

  const { data, error } = (await q) as unknown as { data: TicketRow[]; error: any };
  if (error) return new Response('Error: ' + error.message, { status: 500 });

  const rows = data || [];

  const headers = [
    'Ticket Code',
    'Created At',
    'Status',
    'Priority',
    'Category',
    'Sub Category',
    'Other Title',
    'Description',
    'Store',
    'Store Code',
    'ASM',
    'Store Phone',
    'Resolved At',
  ];

  const lines = [headers.join(',')];
  for (const t of rows) {
    lines.push(
      [
        t.ticket_code,
        t.created_at,
        t.status,
        t.priority,
        t.category,
        t.sub_category,
        t.other_title,
        t.description,
        t.stores?.name,
        t.store_code,
        t.stores?.asm_owner,
        t.stores?.phone,
        t.resolved_at,
      ]
        .map(csvCell)
        .join(',')
    );
  }

  const csv = '﻿' + lines.join('\r\n'); // BOM → Excel reads UTF-8 (Telugu) correctly
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tickets_${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}