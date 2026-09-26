-- Activity log, notes and attachments.
--
-- The first version of the app synthesised a timeline in the component (the
-- dispatch entry was literally "created_at + 20 minutes"). These tables make
-- it real: every status change, dispatch, NTE increase and note writes an
-- event row, so the work order history is auditable rather than decorative.
--
-- Attachments give the completion gates something to actually satisfy —
-- before/after photos and a sign-off sheet were referenced by the UI with
-- nowhere to upload them.

-- Work order numbers were hand-written in the seed. A sequence lets the app
-- mint the next one without a round-trip to check the highest existing value.
-- Starts above the seeded range (WO-3025).
create sequence if not exists work_order_number_seq start with 3100;

create function public.next_work_order_number()
returns text
language sql
volatile
as $$
  select 'WO-' || nextval('work_order_number_seq')::text;
$$;

-- Every meaningful thing that happens to a work order. `kind` stays a text
-- check rather than an enum so new event types don't need a migration that
-- rewrites the type.
create table work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  kind text not null check (
    kind in (
      'created',
      'status_changed',
      'vendor_assigned',
      'vendor_changed',
      'nte_increased',
      'quote_submitted',
      'quote_decided',
      'note_added',
      'attachment_added',
      'sign_off_recorded'
    )
  ),
  summary text not null,
  -- Who did it. actor_name is denormalised so history survives a profile
  -- being deleted, and so seeded/imported rows can name an external actor.
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  -- Shape varies by kind (from/to status, amounts, vendor ids).
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index work_order_events_wo_idx
  on work_order_events (work_order_id, created_at desc);

create table work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  body text not null,
  -- MTC distinguishes what the client may see from internal coordination.
  visibility text not null default 'internal' check (visibility in ('internal', 'client')),
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);

create index work_order_notes_wo_idx
  on work_order_notes (work_order_id, created_at desc);

create table work_order_attachments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  kind text not null check (
    kind in ('before_photo', 'after_photo', 'document', 'sign_off', 'compliance')
  ),
  -- Path inside the `work-order-files` storage bucket.
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create index work_order_attachments_wo_idx
  on work_order_attachments (work_order_id, kind);

alter table work_order_events enable row level security;
alter table work_order_notes enable row level security;
alter table work_order_attachments enable row level security;

create policy "Authenticated staff can read work order events" on work_order_events
  for select using (auth.role() = 'authenticated');
-- Events are append-only: no update or delete policy, so history can't be
-- quietly rewritten from the client.
create policy "Authenticated staff can append work order events" on work_order_events
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated staff can read work order notes" on work_order_notes
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can add work order notes" on work_order_notes
  for insert with check (auth.role() = 'authenticated');
create policy "Authors can edit their own notes" on work_order_notes
  for update using (auth.uid() = author_id);
create policy "Authors can delete their own notes" on work_order_notes
  for delete using (auth.uid() = author_id);

create policy "Authenticated staff can read attachments" on work_order_attachments
  for select using (auth.role() = 'authenticated');
create policy "Authenticated staff can add attachments" on work_order_attachments
  for insert with check (auth.role() = 'authenticated');
create policy "Uploaders can remove their own attachments" on work_order_attachments
  for delete using (auth.uid() = uploaded_by);
