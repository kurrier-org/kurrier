\set rls_client_password `echo "$RLS_CLIENT_PASSWORD"`



CREATE OR REPLACE FUNCTION public.__ensure_policy(p_name text, p_rel regclass, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = p_name AND polrelid = p_rel) THEN
    EXECUTE p_sql;
END IF;
END$$;


CREATE USER rls_client
WITH LOGIN PASSWORD :'rls_client_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- WITH LOGIN PASSWORD 'vZEkBcx4jEJ4J6I' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

GRANT anon TO rls_client;

GRANT authenticated TO rls_client;

-- REVOKE ALL ON SCHEMA public FROM PUBLIC;
-- GRANT USAGE ON SCHEMA public TO rls_client;


-- Use Postgres to create a bucket.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
    on conflict (id) do nothing;


-- Private: owner-only CRUD
create policy "private-own-crud"
on storage.objects
for all to authenticated
using (
  bucket_id = 'attachments'
  and name like 'private/' || auth.uid()::text || '/%'
)
with check (
  bucket_id = 'attachments'
  and name like 'private/' || auth.uid()::text || '/%'
);

create policy "eml-own-crud"
on storage.objects
for all to authenticated
using (
  bucket_id = 'attachments'
  and name like 'eml/' || auth.uid()::text || '/%'
)
with check (
  bucket_id = 'attachments'
  and name like 'eml/' || auth.uid()::text || '/%'
);
