-- Web Push の購読。端末（endpoint）ごとに、どの Account 宛ての Post を通知するか
create table push_subscription (
  endpoint text primary key check (endpoint like 'https://%' and length(endpoint) <= 2000),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references account on delete cascade,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

alter table push_subscription enable row level security;

create policy push_all on push_subscription for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from account a where a.id = account_id and a.user_id = (select auth.uid())));
