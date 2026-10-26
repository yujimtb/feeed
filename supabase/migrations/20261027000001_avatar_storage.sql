-- プロフィール画像の置き場。公開バケットで、パスは <account_id>/avatar。
-- storage スキーマは PGlite のテストに無いので、テーブル定義とは別ファイルにしている
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

-- 自分の Account のフォルダにだけ書ける。サブクエリ内では name が account.name に解決されるので objects.name と修飾する
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and exists (
    select 1 from public.account a
    where a.id::text = (storage.foldername(storage.objects.name))[1] and a.user_id = (select auth.uid())));
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and exists (
    select 1 from public.account a
    where a.id::text = (storage.foldername(storage.objects.name))[1] and a.user_id = (select auth.uid())));
create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
