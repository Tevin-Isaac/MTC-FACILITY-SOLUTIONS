-- MTC Work Order Platform — initial schema
-- Mirrors src/types/work-order.ts. Run via `supabase db push` once a
-- project is linked (see README "Connecting Supabase").

create extension if not exists "pgcrypto";

-- Staff profile, one row per authenticated user (created via a trigger on
-- auth.users signup — see below). Roles loosely follow the New Hire manual
-- org chart (CEO, Account Manager, Vendor Relations, Facility Coordinator,
-- After-Hours) plus a vendor role for future vendor-portal access.
create type staff_role as enum (
  'owner',
  'admin',
  'account_manager',
  'vendor_relations',
  'coordinator',
  'after_hours',
  'vendor'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role staff_role not null default 'coordinator',
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('commercial', 'residential')),
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  store_code text,
  name text not null,
  address text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  hours_of_operation text
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trades text[] not null default '{}',
  phone text,
  email text,
  coi_expires_at date,
  license_expires_at date,
  rate_card_hourly numeric,
  is_last_resort boolean not null default false,
  active boolean not null default true
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  wo_number text not null unique,
  legacy_wo_number text,
  site_id uuid not null references sites(id) on delete restrict,
  trade text not null,
  priority text not null,
  status text not null,
  description text not null,
  po_number text,
  nte numeric,
  dne numeric,
  vendor_id uuid references vendors(id) on delete set null,
  sla_respond_by timestamptz,
  sla_resolve_by timestamptz,
  created_at timestamptz not null default now(),
  closed_at timestamptz,

  -- ServiceChannel intake fields — see reference_servicechannel_workflow
  -- memory and docs/data-model.md for why these exist.
  source text not null default 'manual' check (source in ('service_channel', 'outlook_email', 'phone', 'manual')),
  external_tracking_number text,
  client_extended_status text,
  category text check (category in ('building_rm', 'capex', 'maintenance')),
  gl_code text,
  reporter_name text,
  reporter_cell text
);

create index work_orders_site_id_idx on work_orders(site_id);
create index work_orders_vendor_id_idx on work_orders(vendor_id);
create index work_orders_status_idx on work_orders(status);
create index work_orders_external_tracking_number_idx on work_orders(external_tracking_number);

create table nte_increases (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  amount numeric not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  method text not null check (method in ('phone', 'email', 'sms')),
  note text
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  option_type text not null check (option_type in ('single', 'repair_vs_replace')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'declined')),
  approved_by text,
  approved_at timestamptz
);

create table quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  side text not null check (side in ('repair', 'replace')),
  description text not null,
  kind text not null check (kind in ('incurred', 'proposed')),
  labor_hours numeric,
  labor_rate numeric,
  materials_cost numeric,
  markup_percent numeric
);

create table completion_records (
  work_order_id uuid primary key references work_orders(id) on delete cascade,
  before_photo_urls text[] not null default '{}',
  after_photo_urls text[] not null default '{}',
  after_video_url text,
  technician_notes text,
  root_cause text,
  sign_off_name text,
  sign_off_signature_url text,
  sign_off_at timestamptz
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue')),
  amount numeric not null,
  issued_at timestamptz,
  due_at timestamptz
);

-- Auto-create a profile row when a staff member signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: this is an internal tool — any authenticated staff member can read
-- and write all operational tables. Tighten with per-role policies later
-- (e.g. only vendor_relations can write vendors, only owner/admin see
-- finance) once real usage patterns are clear.
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table sites enable row level security;
alter table vendors enable row level security;
alter table work_orders enable row level security;
alter table nte_increases enable row level security;
alter table quotes enable row level security;
alter table quote_line_items enable row level security;
alter table completion_records enable row level security;
alter table invoices enable row level security;

create policy "Staff can view their own profile" on profiles
  for select using (auth.uid() = id);
create policy "Staff can update their own profile" on profiles
  for update using (auth.uid() = id);

create policy "Authenticated staff can read accounts" on accounts
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write accounts" on accounts
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read sites" on sites
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write sites" on sites
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read vendors" on vendors
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write vendors" on vendors
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read work orders" on work_orders
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write work orders" on work_orders
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read nte increases" on nte_increases
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write nte increases" on nte_increases
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read quotes" on quotes
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write quotes" on quotes
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read quote line items" on quote_line_items
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write quote line items" on quote_line_items
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read completion records" on completion_records
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write completion records" on completion_records
  for all using (auth.role() = 'authenticated');

create policy "Authenticated staff can read invoices" on invoices
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can write invoices" on invoices
  for all using (auth.role() = 'authenticated');
