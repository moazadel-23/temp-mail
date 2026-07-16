-- Enable pgcrypto extension
create extension if not exists pgcrypto;

-- Create site_content table
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on site_content
alter table public.site_content enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Public can read site_content" on public.site_content;
drop policy if exists "Public can insert site_content" on public.site_content;
drop policy if exists "Public can update site_content" on public.site_content;
drop policy if exists "Public can delete site_content" on public.site_content;
drop policy if exists "Allow public read" on public.site_content;
drop policy if exists "Allow authenticated insert" on public.site_content;
drop policy if exists "Allow authenticated update" on public.site_content;
drop policy if exists "Allow authenticated delete" on public.site_content;

-- Create production policies for site_content
create policy "Allow public read"
  on public.site_content for select
  using (true);

create policy "Allow authenticated insert"
  on public.site_content for insert
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated update"
  on public.site_content for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Allow authenticated delete"
  on public.site_content for delete
  using (auth.role() = 'authenticated');

-- Create index for performance
create index if not exists site_content_updated_at_idx
  on public.site_content(updated_at desc);

-- ======================================================
-- Supabase Storage Setup (Run inside SQL Editor)
-- ======================================================

-- 1. Create storage bucket for uploads if not exists
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

-- 2. Enable RLS for storage.objects
alter table storage.objects enable row level security;

-- 3. Drop existing storage policies if they exist
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can delete" on storage.objects;

-- 4. Create storage policies
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'uploads' );

create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'uploads' );

create policy "Authenticated users can delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'uploads' );
