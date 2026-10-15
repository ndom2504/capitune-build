-- Public share links for generated sites (unguessable token, files only).

alter table public.projects
  add column if not exists publish_token text;

create unique index if not exists projects_publish_token_uidx
  on public.projects (publish_token)
  where publish_token is not null;
