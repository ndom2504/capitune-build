-- Durable per-account generation quota (Vercel has no shared in-memory store).

create table if not exists public.generation_quotas (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  count integer not null default 0 check (count >= 0)
);

alter table public.generation_quotas enable row level security;

create or replace function public.consume_generation_quota(
  p_owner_id uuid,
  p_max integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.generation_quotas%rowtype;
  now_ts timestamptz := now();
  retry_ms bigint;
begin
  insert into public.generation_quotas (owner_id, window_started_at, count)
  values (p_owner_id, now_ts, 0)
  on conflict (owner_id) do nothing;

  select * into rec from public.generation_quotas where owner_id = p_owner_id for update;

  if rec.window_started_at + (p_window_seconds::text || ' seconds')::interval <= now_ts then
    update public.generation_quotas
      set window_started_at = now_ts, count = 1
      where owner_id = p_owner_id;
    return jsonb_build_object('ok', true);
  end if;

  if rec.count >= p_max then
    retry_ms := greatest(
      0,
      floor(extract(epoch from (rec.window_started_at + (p_window_seconds::text || ' seconds')::interval - now_ts)) * 1000)
    );
    return jsonb_build_object('ok', false, 'retry_after_ms', retry_ms);
  end if;

  update public.generation_quotas
    set count = count + 1
    where owner_id = p_owner_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.consume_generation_quota(uuid, integer, integer) from public;
grant execute on function public.consume_generation_quota(uuid, integer, integer) to service_role;
