-- Account のプロフィール画像。Storage の公開URLか外部URLを保持する
alter table account add column avatar_url text check (avatar_url is null or length(avatar_url) <= 2000);

create policy account_update on account for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
