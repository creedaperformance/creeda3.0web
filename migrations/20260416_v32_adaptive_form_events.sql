create table if not exists adaptive_form_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('athlete', 'individual', 'coach')),
  flow_id text not null,
  flow_version text,
  flow_kind text check (flow_kind in ('onboarding', 'daily')),
  session_id text not null,
  step_id text,
  question_id text,
  entry_source text,
  entry_mode text check (entry_mode in ('direct', 'enrichment')),
  event_name text not null check (
    event_name in (
      'adaptive_form_opened',
      'adaptive_form_step_viewed',
      'adaptive_form_step_completed',
      'adaptive_form_completed',
      'adaptive_enrichment_opened',
      'adaptive_next_question_resolved'
    )
  ),
  event_properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists adaptive_form_events_flow_idx
  on adaptive_form_events (flow_id, event_name, created_at desc);

create index if not exists adaptive_form_events_user_session_idx
  on adaptive_form_events (user_id, session_id, created_at asc);

create index if not exists adaptive_form_events_role_created_idx
  on adaptive_form_events (role, created_at desc);

alter table adaptive_form_events enable row level security;

drop policy if exists "adaptive_form_events_owner_select" on adaptive_form_events;
create policy "adaptive_form_events_owner_select"
  on adaptive_form_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "adaptive_form_events_owner_insert" on adaptive_form_events;
create policy "adaptive_form_events_owner_insert"
  on adaptive_form_events
  for insert
  with check (auth.uid() = user_id);
