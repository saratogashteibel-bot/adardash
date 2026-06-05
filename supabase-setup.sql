-- Run this in your Supabase SQL editor

-- Entities table
create table entities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null,
  color int default 0,
  created_at timestamptz default now()
);

-- Notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  entity_id uuid references entities(id) on delete cascade,
  who text not null,
  body text not null,
  attachment_url text,
  attachment_name text,
  created_at timestamptz default now()
);

-- Storage bucket for attachments
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);

-- Storage policy: anyone can upload/read
create policy "Public attachments" on storage.objects
  for all using (bucket_id = 'attachments') with check (bucket_id = 'attachments');

-- Enable realtime on notes
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table entities;

-- RLS: open read/write (no auth — shared link app)
alter table entities enable row level security;
alter table notes enable row level security;

create policy "Open entities" on entities for all using (true) with check (true);
create policy "Open notes" on notes for all using (true) with check (true);

-- Seed some starter entities (edit these to match Adar Global)
insert into entities (name, type, color) values
  ('E-Commerce', 'Division', 0),
  ('US Real Estate', 'Division', 1),
  ('Canadian Real Estate', 'Division', 2),
  ('Misc.', 'General', 3),
  ('Message for Motche Shloime', 'Direct', 4),
  ('Message for Motty', 'Direct', 5),
  ('Message for Jonathan', 'Direct', 6);
  ('Operations', 'Department', 0),
  ('Sales', 'Department', 1),
  ('Finance', 'Department', 2),
  ('HR', 'Department', 3);
