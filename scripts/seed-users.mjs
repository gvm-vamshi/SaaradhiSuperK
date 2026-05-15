// ============================================================
// seed-users.mjs
// ------------------------------------------------------------
// Creates the demo users in Supabase Auth and their profiles.
// Run AFTER you've applied 0001_init.sql and 0002_seed.sql.
//
// Usage:
//   1. Fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env
//   2. node scripts/seed-users.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// minimal .env loader (so we don't need dotenv as a dep)
try {
  const env = readFileSync('.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env optional if vars are already set */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

// Sanity check: the new sb_secret_* keys refuse to work in browser-like environments
// (StackBlitz WebContainer, browser dev consoles, etc.) for security. If you're running
// this from StackBlitz and seeing "Forbidden use of secret API key in browser",
// run this script from your local machine instead, OR use the SQL alternative at
// supabase/seed/0003_seed_users.sql (run in Supabase SQL Editor).
if (typeof window !== 'undefined' || process.env.STACKBLITZ === '1') {
  console.error('\n✗ This script must run from a real Node.js process, not a browser-like env.');
  console.error('  Run it locally:  node scripts/seed-users.mjs');
  console.error('  Or use the SQL alternative: supabase/seed/0003_seed_users.sql\n');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ------------------------------------------------------------
// Demo users
// ------------------------------------------------------------
const USERS = [
  // Store Partners
  { email: 'ramesh@superk.in',  password: 'Welcome@123', full_name: 'Ramesh Kumar',   role: 'sp', store_code: 'STR001' },
  { email: 'anita@superk.in',   password: 'Welcome@123', full_name: 'Anita Reddy',    role: 'sp', store_code: 'STR002' },
  { email: 'vikram@superk.in',  password: 'Welcome@123', full_name: 'Vikram Singh',   role: 'sp', store_code: 'STR003' },
  { email: 'priya@superk.in',   password: 'Welcome@123', full_name: 'Priya Menon',    role: 'sp', store_code: 'STR004' },
  { email: 'suresh@superk.in',  password: 'Welcome@123', full_name: 'Suresh Naidu',   role: 'sp', store_code: 'STR005' },

  // Agents
  { email: 'karthik@superk.in', password: 'Agent@123',   full_name: 'Karthik Iyer',   role: 'agent', team: 'Inventory Help Desk', categories_handled: ['Inventory'] },
  { email: 'deepa@superk.in',   password: 'Agent@123',   full_name: 'Deepa Rao',      role: 'agent', team: 'IT Help Desk',        categories_handled: ['Billing'] },
  { email: 'mahesh@superk.in',  password: 'Agent@123',   full_name: 'Mahesh Gupta',   role: 'agent', team: 'Finance',             categories_handled: ['Payments'] },
  { email: 'lakshmi@superk.in', password: 'Agent@123',   full_name: 'Lakshmi Pillai', role: 'agent', team: 'Operations',          categories_handled: ['Operations'] },
  { email: 'arjun@superk.in',   password: 'Agent@123',   full_name: 'Arjun Verma',    role: 'agent', team: 'HR',                  categories_handled: ['HR'] },
  { email: 'neha@superk.in',    password: 'Agent@123',   full_name: 'Neha Shah',      role: 'agent', team: 'Marketing',           categories_handled: ['Marketing'] },

  // Admin
  { email: 'admin@superk.in',   password: 'Admin@123',   full_name: 'SuperK Admin',   role: 'admin' },
];

async function ensureUser(u) {
  // 1. Create or find the auth user
  let userId;

  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = existing?.users.find(x => x.email === u.email);

  if (match) {
    userId = match.id;
    console.log(`  · ${u.email}: auth user already exists`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ✗ ${u.email}:`, error.message);
      return;
    }
    userId = data.user.id;
    console.log(`  ✓ ${u.email}: auth user created`);
  }

  // 2. Upsert profile
  const profile = {
    id: userId,
    full_name: u.full_name,
    role: u.role,
    store_code: u.store_code || null,
    team: u.team || null,
    categories_handled: u.categories_handled || null,
  };

  const { error: pErr } = await supabase.from('profiles').upsert(profile);
  if (pErr) console.error(`    profile error for ${u.email}:`, pErr.message);
  else      console.log(`    profile upserted (role=${u.role})`);
}

console.log('Seeding SuperK users...\n');
for (const u of USERS) await ensureUser(u);
console.log('\nDone.');
