-- ============================================================
-- SuperK — Seed Data
-- ============================================================
-- Run AFTER 0001_init.sql. This seeds the reference data
-- (stores, categories, KB). Auth users + profiles are created
-- by `scripts/seed-users.mjs` since auth.users needs the Admin API.

-- ---------- STORES ----------
insert into stores (code, name, city, state, region, asm_owner) values
  ('STR001', 'SuperK Jubilee Hills',  'Hyderabad', 'Telangana',   'South-1', 'Rajesh M.'),
  ('STR002', 'SuperK Indiranagar',    'Bengaluru', 'Karnataka',   'South-1', 'Rajesh M.'),
  ('STR003', 'SuperK Andheri West',   'Mumbai',    'Maharashtra', 'West-1',  'Sunita K.'),
  ('STR004', 'SuperK Kothrud',        'Pune',      'Maharashtra', 'West-1',  'Sunita K.'),
  ('STR005', 'SuperK T. Nagar',       'Chennai',   'Tamil Nadu',  'South-2', 'Praveen R.')
on conflict (code) do nothing;

-- ---------- CATEGORIES ----------
insert into categories (category, sub_category, default_priority, routed_to_team) values
  ('Inventory',  'Stock Mismatch',       'Medium',   'Inventory Help Desk'),
  ('Inventory',  'Damaged Goods',        'Medium',   'Supply Chain'),
  ('Inventory',  'Short Supply',         'High',     'Supply Chain'),
  ('Inventory',  'Other',                'Medium',   'Inventory Help Desk'),
  ('Billing',    'POS Down',             'Critical', 'IT Help Desk'),
  ('Billing',    'Receipt Printer',      'High',     'IT Help Desk'),
  ('Billing',    'Other',                'Medium',   'IT Help Desk'),
  ('Payments',   'UPI Settlement',       'High',     'Finance'),
  ('Payments',   'Card Machine',         'High',     'Finance'),
  ('Payments',   'Other',                'Medium',   'Finance'),
  ('Operations', 'Store Timings',        'Low',      'Operations'),
  ('Operations', 'Power / Generator',    'Critical', 'Facilities'),
  ('Operations', 'Other',                'Medium',   'Operations'),
  ('HR',         'Salary',               'Medium',   'HR'),
  ('HR',         'New Hire',             'Low',      'HR'),
  ('HR',         'Other',                'Medium',   'HR'),
  ('Marketing',  'Promo Not Reflecting', 'Medium',   'Marketing'),
  ('Marketing',  'POSM Material',        'Low',      'Marketing'),
  ('Marketing',  'Other',                'Medium',   'Marketing'),
  ('Other',      'General Query',        'Low',      'ASM'),
  ('Other',      'Other',                'Low',      'ASM')
on conflict (category, sub_category) do nothing;

-- ---------- KNOWLEDGE BASE ----------
insert into knowledge_base (category, sub_category, question, answer, keywords, owner) values
  ('Inventory', 'Stock Mismatch',
   'What do I do if system stock and physical stock don''t match?',
   E'1. Recount the SKU using the SuperK app → Stock Audit module.\n2. If mismatch persists, capture a photo of the shelf + back-store.\n3. Submit a Stock Adjustment Request from the same module.\n4. ASM approval is auto-triggered if variance < 2%; above that it routes to Inventory Help Desk.',
   'stock, mismatch, audit, count, variance, shortage, excess',
   'Inventory Team'),

  ('Billing', 'POS Down',
   'POS machine is not working / billing screen frozen',
   E'1. Restart the POS terminal (hold power button 10s).\n2. If still down, switch to backup terminal (Terminal 2).\n3. Use offline billing book — log every sale; sync within 24h via SuperK app.\n4. Raise ticket under Billing → POS Down with terminal serial number.',
   'pos, billing, frozen, not working, terminal, machine, down',
   'IT Help Desk'),

  ('Payments', 'UPI Settlement',
   'UPI payment received but not reflecting in my settlement',
   E'1. Check the UPI app for transaction reference number (UTR).\n2. Open SuperK app → Payments → Reconcile and paste the UTR.\n3. If still missing after 24h, raise a ticket under Payments → UPI Settlement with UTR + screenshot.',
   'upi, payment, settlement, not received, reconcile, utr',
   'Finance'),

  ('Inventory', 'Damaged Goods',
   'How do I return damaged goods received from warehouse?',
   E'1. Click photo of damaged item with batch + MRP visible.\n2. SuperK app → Returns → New DG Return.\n3. Pickup is scheduled within 48h. Credit note in 7 working days.\n4. Don''t put damaged items back on shelf.',
   'damage, return, warehouse, expired, broken, leak',
   'Supply Chain'),

  ('Operations', 'Store Timings',
   'What are the standard store opening and closing timings?',
   E'Standard SuperK timings: 7:00 AM to 10:30 PM, all 7 days.\nFor changes (festival/local restriction), raise a ticket at least 48h in advance under Operations → Timings.',
   'timing, open, close, hours, schedule',
   'Operations'),

  ('HR', 'Salary',
   'When is staff salary credited each month?',
   'Salary for the previous month is credited on the 7th of every month. If 7th is a holiday, on the next working day. For non-credit, raise a ticket under HR → Salary with staff ID.',
   'salary, payroll, staff, credit, payment',
   'HR'),

  ('Marketing', 'Promo Not Reflecting',
   'Promotional discount is not applying at POS',
   E'1. Verify promo is active in SuperK app → Promotions.\n2. Check SKU is included in the promo basket.\n3. Refresh POS by logging out & back in.\n4. If still failing, raise ticket under Marketing → Promo with SKU + promo code.',
   'promo, discount, offer, not applying, pos, scheme',
   'Marketing')
on conflict do nothing;
