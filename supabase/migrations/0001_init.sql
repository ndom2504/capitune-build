-- Capitune initial schema
-- Apply in the Supabase SQL editor or via the CLI after creating a project.
-- RLS assumes Supabase Auth: auth.uid() is the owner.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  path text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  unique (project_id, path)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  demo_mode boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_version_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.project_versions (id) on delete cascade,
  path text not null,
  content text not null
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists project_files_project_id_idx on public.project_files (project_id);
create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists project_versions_project_id_idx on public.project_versions (project_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.project_versions enable row level security;
alter table public.project_version_files enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = case
          when excluded.display_name = '' then public.profiles.display_name
          else excluded.display_name
        end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.apply_project_files(
  p_owner_id uuid,
  p_project_id uuid,
  p_label text,
  p_files jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_version_id uuid;
  v_now timestamptz := now();
  v_file jsonb;
  v_result jsonb;
begin
  select owner_id into v_owner from public.projects where id = p_project_id;
  if v_owner is null then
    raise exception 'NOT_FOUND';
  end if;
  if v_owner <> p_owner_id then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.project_versions (project_id, label, created_at)
  values (p_project_id, p_label, v_now)
  returning id into v_version_id;

  for v_file in select * from jsonb_array_elements(coalesce(p_files, '[]'::jsonb))
  loop
    insert into public.project_version_files (version_id, path, content)
    values (v_version_id, v_file->>'path', coalesce(v_file->>'content', ''));
  end loop;

  delete from public.project_files where project_id = p_project_id;

  for v_file in select * from jsonb_array_elements(coalesce(p_files, '[]'::jsonb))
  loop
    insert into public.project_files (project_id, path, content, updated_at)
    values (p_project_id, v_file->>'path', coalesce(v_file->>'content', ''), v_now);
  end loop;

  update public.projects set updated_at = v_now where id = p_project_id;

  select jsonb_build_object(
    'version', (select to_jsonb(v) from public.project_versions v where v.id = v_version_id),
    'files', coalesce(
      (select jsonb_agg(to_jsonb(f) order by f.path) from public.project_files f where f.project_id = p_project_id),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.apply_project_files(uuid, uuid, text, jsonb) from public;
grant execute on function public.apply_project_files(uuid, uuid, text, jsonb) to service_role;

create policy projects_owner_all on public.projects
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy project_files_owner_all on public.project_files
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy conversations_owner_all on public.conversations
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy messages_owner_all on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = conversation_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      join public.projects p on p.id = c.project_id
      where c.id = conversation_id and p.owner_id = auth.uid()
    )
  );

create policy versions_owner_all on public.project_versions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

create policy version_files_owner_all on public.project_version_files
  for all using (
    exists (
      select 1 from public.project_versions v
      join public.projects p on p.id = v.project_id
      where v.id = version_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.project_versions v
      join public.projects p on p.id = v.project_id
      where v.id = version_id and p.owner_id = auth.uid()
    )
  );

-- Service-role note:
-- SUPABASE_SERVICE_ROLE_KEY bypasses RLS. It must stay server-side only.
-- This milestone does not call the service role from the browser or from generated code.
