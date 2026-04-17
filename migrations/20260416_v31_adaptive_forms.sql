create table if not exists adaptive_form_profiles (
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('athlete', 'individual', 'coach')),
  flow_id text not null,
  flow_version text not null,
  core_fields jsonb not null default '{}'::jsonb,
  optional_fields jsonb not null default '{}'::jsonb,
  inferred_fields jsonb not null default '{}'::jsonb,
  completion_score integer not null default 0 check (completion_score >= 0 and completion_score <= 100),
  confidence_score integer not null default 0 check (confidence_score >= 0 and confidence_score <= 100),
  confidence_level text not null default 'low' check (confidence_level in ('low', 'medium', 'high')),
  confidence_recommendations text[] not null default '{}'::text[],
  next_question_ids text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role, flow_id)
);

create table if not exists adaptive_daily_logs (
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('athlete', 'individual')),
  flow_id text not null,
  flow_version text not null,
  log_date date not null,
  minimal_signals jsonb not null default '{}'::jsonb,
  inferred_signals jsonb not null default '{}'::jsonb,
  anomaly_flags text[] not null default '{}'::text[],
  follow_up_field_ids text[] not null default '{}'::text[],
  readiness_score integer check (readiness_score is null or (readiness_score >= 0 and readiness_score <= 100)),
  confidence_score integer check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role, flow_id, log_date)
);

create index if not exists adaptive_form_profiles_role_idx
  on adaptive_form_profiles (role, updated_at desc);

create index if not exists adaptive_daily_logs_role_date_idx
  on adaptive_daily_logs (role, log_date desc);

alter table adaptive_form_profiles enable row level security;
alter table adaptive_daily_logs enable row level security;

drop policy if exists "adaptive_form_profiles_owner_select" on adaptive_form_profiles;
create policy "adaptive_form_profiles_owner_select"
  on adaptive_form_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "adaptive_form_profiles_owner_insert" on adaptive_form_profiles;
create policy "adaptive_form_profiles_owner_insert"
  on adaptive_form_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "adaptive_form_profiles_owner_update" on adaptive_form_profiles;
create policy "adaptive_form_profiles_owner_update"
  on adaptive_form_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "adaptive_daily_logs_owner_select" on adaptive_daily_logs;
create policy "adaptive_daily_logs_owner_select"
  on adaptive_daily_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "adaptive_daily_logs_owner_insert" on adaptive_daily_logs;
create policy "adaptive_daily_logs_owner_insert"
  on adaptive_daily_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "adaptive_daily_logs_owner_update" on adaptive_daily_logs;
create policy "adaptive_daily_logs_owner_update"
  on adaptive_daily_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function set_adaptive_forms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists adaptive_form_profiles_set_updated_at on adaptive_form_profiles;
create trigger adaptive_form_profiles_set_updated_at
before update on adaptive_form_profiles
for each row
execute function set_adaptive_forms_updated_at();

drop trigger if exists adaptive_daily_logs_set_updated_at on adaptive_daily_logs;
create trigger adaptive_daily_logs_set_updated_at
before update on adaptive_daily_logs
for each row
execute function set_adaptive_forms_updated_at();
