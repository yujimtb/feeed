-- Account はユーザーが所有する投稿者プロフィール。ログイン主体はユーザーのみ。
create table account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 50),
  kind text not null check (kind in ('human', 'agent', 'source')),
  created_at timestamptz not null default now()
);

create table post (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references account on delete cascade,
  via text not null check (via in ('web', 'mcp')),
  body text not null check (length(body) between 1 and 10000),
  reply_to uuid references post on delete cascade,
  root_id uuid references post on delete cascade,
  created_at timestamptz not null default now()
);
create index on post (created_at);
create index on post (root_id);

-- MCP の OAuth クライアントごとに、どの Account として投稿するか
create table oauth_grant (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id uuid not null,
  account_id uuid not null references account on delete cascade,
  primary key (user_id, client_id)
);

-- root_id と created_at はクライアントに決めさせない
create function post_before_insert() returns trigger language plpgsql as $$
begin
  new.created_at := clock_timestamp();
  if new.reply_to is null then
    new.root_id := null;
  else
    -- RLS 下で引くので、他ユーザーの Post には返信できない
    select coalesce(p.root_id, p.id) into new.root_id from post p where p.id = new.reply_to;
    if not found then
      raise exception 'reply_to not found';
    end if;
  end if;
  return new;
end $$;

create trigger post_before_insert before insert on post
  for each row execute function post_before_insert();

alter table account enable row level security;
alter table post enable row level security;
alter table oauth_grant enable row level security;

create policy account_select on account for select to authenticated
  using (user_id = (select auth.uid()));
create policy account_insert on account for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy post_select on post for select to authenticated
  using (exists (select 1 from account a where a.id = account_id and a.user_id = (select auth.uid())));
create policy post_insert on post for insert to authenticated
  with check (exists (select 1 from account a where a.id = account_id and a.user_id = (select auth.uid())));

create policy grant_select on oauth_grant for select to authenticated
  using (user_id = (select auth.uid()));
create policy grant_insert on oauth_grant for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from account a where a.id = account_id and a.user_id = (select auth.uid())));
create policy grant_update on oauth_grant for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from account a where a.id = account_id and a.user_id = (select auth.uid())));
