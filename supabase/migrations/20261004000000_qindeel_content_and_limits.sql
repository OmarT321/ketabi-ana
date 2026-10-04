-- Kitabi Ana schema: reviewed lesson content plus server-only request limits.
-- Consolidated from the three original migrations; the single-application
-- quota (no application id) is the only intentional behavioural change.

create table public.content_items (
  id text primary key,
  kind text not null check (kind in ('lesson')),
  payload jsonb not null,
  content_hash text not null,
  status text not null default 'pending' check (status in ('pending','approved','retired')),
  reviewer_name text,
  reviewed_at timestamptz,
  release text not null default '0.1.0',
  check (status <> 'approved' or (length(trim(reviewer_name)) > 1 and reviewed_at is not null)),
  check (payload->>'id' = id)
);
alter table public.content_items enable row level security;
revoke all on public.content_items from anon,authenticated;
grant select on public.content_items to anon;
grant all on public.content_items to service_role;
create policy approved_content_read on public.content_items for select to anon using (status='approved');
create index content_published_kind on public.content_items(kind) where status='approved';

create table public.runtime_keys(key_hash text primary key, label text not null);
create table public.request_buckets(bucket_key text primary key, count integer not null default 0, expires_at timestamptz not null);
alter table public.runtime_keys enable row level security;
alter table public.request_buckets enable row level security;
revoke all on public.runtime_keys, public.request_buckets from public,anon,authenticated;
grant all on public.runtime_keys, public.request_buckets to service_role;
create index request_buckets_expiry on public.request_buckets(expires_at);

-- Called exclusively by a service-role edge function after shared-secret authentication.
-- Keys contain day-rotated HMACs, never raw IP addresses or user text.
-- Counters stop at the first exceeded limit so rejected requests do not consume the daily/global budget.
create function public.consume_request(p_client_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare minute_key text; daily_key text; global_key text; n integer; d integer; g integer;
begin
  if p_client_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  minute_key:='m:'||p_client_hash||':'||floor(extract(epoch from now())/60)::text;
  daily_key:='d:'||p_client_hash||':'||to_char(now() at time zone 'UTC','YYYY-MM-DD');
  global_key:='global:'||to_char(now() at time zone 'UTC','YYYY-MM-DD');
  delete from public.request_buckets where expires_at < now();
  insert into public.request_buckets values(minute_key,1,now()+interval '2 minutes')
    on conflict(bucket_key) do update set count=public.request_buckets.count+1 returning count into n;
  if n>20 then return false; end if;
  insert into public.request_buckets values(daily_key,1,date_trunc('day',now())+interval '1 day')
    on conflict(bucket_key) do update set count=public.request_buckets.count+1 returning count into d;
  if d>150 then return false; end if;
  insert into public.request_buckets values(global_key,1,date_trunc('day',now())+interval '1 day')
    on conflict(bucket_key) do update set count=public.request_buckets.count+1 returning count into g;
  return g<=2000;
end;
$$;
revoke all on function public.consume_request(text) from public,anon,authenticated;
grant execute on function public.consume_request(text) to service_role;

-- Any change to approved content clears its approval.
create function public.invalidate_changed_review()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.payload is distinct from new.payload or old.content_hash is distinct from new.content_hash or old.release is distinct from new.release or old.kind is distinct from new.kind then
    new.status:='pending'; new.reviewer_name:=null; new.reviewed_at:=null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_changed_review() from public,anon,authenticated;
create trigger content_revision_invalidates_review before update on public.content_items
for each row execute function public.invalidate_changed_review();
