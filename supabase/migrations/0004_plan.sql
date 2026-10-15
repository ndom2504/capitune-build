-- Billing plan on the profile (free / pro). Optional Stripe customer id.

alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  add column if not exists stripe_customer_id text;

do $$
begin
  alter table public.profiles
    add constraint profiles_plan_check check (plan in ('free', 'pro'));
exception
  when duplicate_object then null;
end $$;
