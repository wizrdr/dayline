-- source_key links a series to an entry in the schedule-as-code file (scripts/push-schedule.mjs).
-- Not unique: LWW sync may briefly duplicate a row.
alter table public.tasks add column if not exists source_key text null;
create index if not exists tasks_user_source_key on public.tasks (user_id, source_key) where source_key is not null;
