export type Role = 'sp' | 'agent' | 'admin';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  store_code: string | null;
  team: string | null;
  categories_handled: string[] | null;
  phone: string | null;
}

export interface Store {
  code: string;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  asm_owner: string | null;
  phone: string | null;
}

export interface Category {
  id: number;
  category: string;
  category_te: string | null;
  sub_category: string;
  sub_category_te: string | null;
  default_priority: TicketPriority;
  routed_to_team: string | null;
  active: boolean;
}

export interface Ticket {
  id: number;
  ticket_code: string;
  sp_id: string;
  store_code: string;
  category: string;
  sub_category: string;
  other_title: string | null;
  priority: TicketPriority;
  description: string;
  status: TicketStatus;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: string;
  sender_role: Role;
  body: string;
  created_at: string;
}

export interface KbEntry {
  id: number;
  category: string;
  sub_category: string | null;
  question: string;
  question_te: string | null;
  answer: string;
  answer_te: string | null;
  keywords: string | null;
  status: string;
  owner: string | null;
}

export interface StoreStats {
  code: string;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  asm_owner: string | null;
  phone: string | null;
  partner_name: string;
  total_tickets: number;
  open_count: number;
  in_progress_count: number;
  resolved_count: number;
  pending_count: number;
  critical_pending: number;
  high_pending: number;
}

export const priorityColor = (p: TicketPriority): string => ({
  Critical: 'bg-rose-100 text-rose-700 border-rose-300',
  High: 'bg-orange-100 text-orange-700 border-orange-300',
  Medium: 'bg-amber-100 text-amber-700 border-amber-300',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}[p]);

export const statusColor = (s: TicketStatus): string => ({
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-violet-100 text-violet-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-700',
}[s]);

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}