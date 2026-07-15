create extension if not exists pgcrypto;

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

create policy "Public can read site_content"
  on public.site_content
  for select
  using (true);

create policy "Public can insert site_content"
  on public.site_content
  for insert
  with check (true);

create policy "Public can update site_content"
  on public.site_content
  for update
  using (true)
  with check (true);

create policy "Public can delete site_content"
  on public.site_content
  for delete
  using (true);

create index if not exists site_content_updated_at_idx
  on public.site_content(updated_at desc);
