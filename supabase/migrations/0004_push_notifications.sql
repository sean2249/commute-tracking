create extension if not exists pg_cron;
create extension if not exists pg_net;

grant usage on schema commute to service_role;

create table if not exists commute.push_subscriptions (
  endpoint     text primary key,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table commute.push_subscriptions enable row level security;

alter table commute.events
  add column if not exists reminder_sent_at timestamptz;

create index if not exists events_pending_reminder_idx
  on commute.events (event_at)
  where event = 'board' and reminder_sent_at is null;

create or replace function commute.register_push_subscription(
  p_secret      text,
  p_endpoint    text,
  p_p256dh      text,
  p_auth        text,
  p_user_agent  text default null
) returns void
language plpgsql security definer
set search_path = commute
as $$
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  if p_endpoint is null or p_p256dh is null or p_auth is null then
    raise exception 'missing subscription fields' using errcode='22023';
  end if;
  insert into commute.push_subscriptions (endpoint, p256dh, auth, user_agent, last_seen_at)
  values (p_endpoint, p_p256dh, p_auth, p_user_agent, now())
  on conflict (endpoint) do update
    set p256dh       = excluded.p256dh,
        auth         = excluded.auth,
        user_agent   = coalesce(excluded.user_agent, commute.push_subscriptions.user_agent),
        last_seen_at = now();
end;
$$;

grant execute on function commute.register_push_subscription(text,text,text,text,text) to anon, authenticated;

create or replace function commute.unregister_push_subscription(
  p_secret   text,
  p_endpoint text
) returns void
language plpgsql security definer
set search_path = commute
as $$
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  delete from commute.push_subscriptions where endpoint = p_endpoint;
end;
$$;

grant execute on function commute.unregister_push_subscription(text,text) to anon, authenticated;

create or replace function commute.claim_pending_reminders()
returns table (
  id         uuid,
  direction  text,
  event_at   timestamptz,
  local_date date
)
language plpgsql security definer
set search_path = commute
as $$
begin
  return query
    with candidates as (
      select b.id
      from commute.events b
      where b.event = 'board'
        and b.reminder_sent_at is null
        and b.event_at < now() - interval '40 minutes'
        and b.event_at > now() - interval '120 minutes'
        and not exists (
          select 1 from commute.events a
          where a.local_date = b.local_date
            and a.direction  = b.direction
            and a.event      = 'alight'
            and a.event_at   > b.event_at
        )
    ),
    updated as (
      update commute.events e
      set reminder_sent_at = now()
      where e.id in (select id from candidates)
      returning e.id, e.direction, e.event_at, e.local_date
    )
    select * from updated;
end;
$$;

revoke all on function commute.claim_pending_reminders() from public;
revoke all on function commute.claim_pending_reminders() from anon, authenticated;
grant execute on function commute.claim_pending_reminders() to service_role;

create or replace function commute.list_push_subscriptions()
returns table (endpoint text, p256dh text, auth text)
language sql security definer
set search_path = commute
as $$
  select endpoint, p256dh, auth from commute.push_subscriptions;
$$;

revoke all on function commute.list_push_subscriptions() from public;
revoke all on function commute.list_push_subscriptions() from anon, authenticated;
grant execute on function commute.list_push_subscriptions() to service_role;

create or replace function commute.delete_push_subscription_by_endpoint(p_endpoint text)
returns void
language plpgsql security definer
set search_path = commute
as $$
begin
  delete from commute.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke all on function commute.delete_push_subscription_by_endpoint(text) from public;
revoke all on function commute.delete_push_subscription_by_endpoint(text) from anon, authenticated;
grant execute on function commute.delete_push_subscription_by_endpoint(text) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'commute-send-reminders') then
    perform cron.unschedule('commute-send-reminders');
  end if;
end $$;

select cron.schedule(
  'commute-send-reminders',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://xwqgrpfcuohpstqinkxb.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(current_setting('app.reminder_cron_secret', true), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $cron$
);
