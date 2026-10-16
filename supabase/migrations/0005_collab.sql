-- Project collaborators and invite links (owner remains the billing/quota account).

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_invites (
  token text primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists project_members_user_id_idx on public.project_members (user_id);
create index if not exists project_invites_project_id_idx on public.project_invites (project_id);

alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
