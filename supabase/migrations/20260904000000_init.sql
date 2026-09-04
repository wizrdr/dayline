-- Dayline: initial schema. Column names mirror src/domain/types.ts.
-- updated_at is written by the client (LWW sync); no trigger touches it.

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  note text not null default '',
  color smallint not null default 1 check (color between 1 and 8),
  date date null,
  start_min smallint null check (start_min between 0 and 1439),
  duration_min smallint not null default 30 check (duration_min between 5 and 1440),
  done boolean not null default false,
  kind text not null default 'single' check (kind in ('single', 'series')),
  weekdays smallint[] null,
  start_date date null,
  end_date date null,
  remind_min_before smallint null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.task_overrides (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  series_id uuid not null,
  date date not null,
  done boolean null,
  skipped boolean not null default false,
  start_min smallint null check (start_min between 0 and 1439),
  duration_min smallint null check (duration_min between 5 and 1440),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.ics_feeds (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  url text not null,
  color smallint not null default 1 check (color between 1 and 8),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.push_subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'Europe/Warsaw',
  updated_at timestamptz not null default now()
);

create index tasks_user_updated_idx on public.tasks (user_id, updated_at);
create index task_overrides_user_updated_idx on public.task_overrides (user_id, updated_at);
create index task_overrides_user_series_date_idx on public.task_overrides (user_id, series_id, date);
create index ics_feeds_user_updated_idx on public.ics_feeds (user_id, updated_at);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.tasks enable row level security;
alter table public.task_overrides enable row level security;
alter table public.ics_feeds enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "tasks_select_own" on public.tasks
  for select to authenticated using (user_id = auth.uid());
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (user_id = auth.uid());
create policy "tasks_update_own" on public.tasks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (user_id = auth.uid());

create policy "task_overrides_select_own" on public.task_overrides
  for select to authenticated using (user_id = auth.uid());
create policy "task_overrides_insert_own" on public.task_overrides
  for insert to authenticated with check (user_id = auth.uid());
create policy "task_overrides_update_own" on public.task_overrides
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "task_overrides_delete_own" on public.task_overrides
  for delete to authenticated using (user_id = auth.uid());

create policy "ics_feeds_select_own" on public.ics_feeds
  for select to authenticated using (user_id = auth.uid());
create policy "ics_feeds_insert_own" on public.ics_feeds
  for insert to authenticated with check (user_id = auth.uid());
create policy "ics_feeds_update_own" on public.ics_feeds
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ics_feeds_delete_own" on public.ics_feeds
  for delete to authenticated using (user_id = auth.uid());

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.tasks, public.task_overrides, public.ics_feeds;
