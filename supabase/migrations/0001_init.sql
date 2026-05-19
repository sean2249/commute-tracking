create extension if not exists pgcrypto;

create schema if not exists commute;

create table commute.events (
  id            uuid primary key default gen_random_uuid(),
  event_at      timestamptz not null default now(),
  local_date    date         not null,
  local_time    time         not null,
  weekday       smallint     not null,
  direction     text         not null check (direction in ('to_work','from_work')),
  event         text         not null check (event in ('board','alight')),
  weather       text         not null default 'unknown',
  temp_c        numeric,
  lat           numeric,
  lon           numeric,
  note          text,
  created_at    timestamptz  not null default now()
);

create index events_event_at_idx on commute.events (event_at desc);
create index events_dir_wk_wx_idx on commute.events (direction, weekday, weather);
create index events_date_dir_event_idx on commute.events (local_date, direction, event);

alter table commute.events enable row level security;

create table commute.config (
  key   text primary key,
  value text not null
);

alter table commute.config enable row level security;
-- Intentionally no policies: only SECURITY DEFINER functions (commute.check_secret)
-- can read this table. Anon key cannot touch the secret hash directly.

create or replace view commute.durations as
select
  b.local_date,
  b.direction,
  b.weekday,
  b.weather as board_weather,
  b.event_at as board_at,
  a.event_at as alight_at,
  extract(epoch from (a.event_at - b.event_at)) / 60.0 as duration_min
from commute.events b
join lateral (
  select event_at from commute.events
  where local_date = b.local_date
    and direction  = b.direction
    and event      = 'alight'
    and event_at   > b.event_at
  order by event_at asc
  limit 1
) a on true
where b.event = 'board'
  and extract(epoch from (a.event_at - b.event_at)) / 60.0 between 1 and 240;

create or replace view commute.predictions as
select
  direction,
  weekday,
  board_weather as weather,
  percentile_cont(0.5) within group (order by duration_min)::numeric(10,1) as median_min,
  percentile_cont(0.9) within group (order by duration_min)::numeric(10,1) as p90_min,
  count(*)::int as n
from commute.durations
group by direction, weekday, board_weather;

create or replace view commute.predictions_weekday as
select
  direction,
  weekday,
  percentile_cont(0.5) within group (order by duration_min)::numeric(10,1) as median_min,
  percentile_cont(0.9) within group (order by duration_min)::numeric(10,1) as p90_min,
  count(*)::int as n
from commute.durations
group by direction, weekday;

create or replace function commute.check_secret(p_secret text) returns boolean
language plpgsql security definer
set search_path = commute, public, extensions
as $$
declare h text;
begin
  select value into h from commute.config where key = 'secret_hash';
  return h is not null and h = extensions.crypt(p_secret, h);
end;
$$;

create or replace function commute.log_event(
  p_secret    text,
  p_direction text,
  p_event     text,
  p_weather   text default 'unknown',
  p_temp_c    numeric default null,
  p_lat       numeric default null,
  p_lon       numeric default null,
  p_note      text default null
) returns jsonb
language plpgsql security definer
set search_path = commute, public
as $$
declare
  v_now     timestamptz := now();
  v_local   timestamp   := (v_now at time zone 'Asia/Taipei');
  v_weekday smallint    := extract(isodow from v_local)::smallint;
  v_date    date        := v_local::date;
  v_time    time        := v_local::time;
  v_id      uuid;
  v_pred    record;
  v_src     text        := null;
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_direction not in ('to_work','from_work') then
    raise exception 'invalid direction' using errcode = '22023';
  end if;
  if p_event not in ('board','alight') then
    raise exception 'invalid event' using errcode = '22023';
  end if;

  insert into commute.events
    (event_at, local_date, local_time, weekday, direction, event, weather, temp_c, lat, lon, note)
  values
    (v_now, v_date, v_time, v_weekday,
     p_direction, p_event, p_weather, p_temp_c, p_lat, p_lon, p_note)
  returning id into v_id;

  if p_event = 'board' then
    select * into v_pred from commute.predictions
    where direction = p_direction
      and weekday   = v_weekday
      and weather   = p_weather
      and n >= 3;
    if found then v_src := 'weather'; end if;

    if not found then
      select * into v_pred from commute.predictions_weekday
      where direction = p_direction
        and weekday   = v_weekday
        and n >= 3;
      if found then v_src := 'weekday'; end if;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'logged_at', v_now,
    'local_date', v_date,
    'local_time', v_time,
    'weekday', v_weekday,
    'prediction', case when v_pred is null then null else
      jsonb_build_object(
        'median_min', v_pred.median_min,
        'p90_min',    v_pred.p90_min,
        'n',          v_pred.n,
        'source',     v_src
      ) end
  );
end;
$$;

create or replace function commute.list_events(p_secret text, p_limit int default 50)
returns table (
  id uuid,
  event_at timestamptz,
  local_date date,
  local_time time,
  weekday smallint,
  direction text,
  event text,
  weather text,
  temp_c numeric,
  note text
)
language plpgsql security definer
set search_path = commute
as $$
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  return query
    select e.id, e.event_at, e.local_date, e.local_time, e.weekday,
           e.direction, e.event, e.weather, e.temp_c, e.note
    from commute.events e
    order by e.event_at desc
    limit p_limit;
end;
$$;

create or replace function commute.delete_event(p_secret text, p_id uuid) returns void
language plpgsql security definer
set search_path = commute
as $$
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  delete from commute.events where id = p_id;
end;
$$;

create or replace function commute.update_note(p_secret text, p_id uuid, p_note text) returns void
language plpgsql security definer
set search_path = commute
as $$
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  update commute.events set note = p_note where id = p_id;
end;
$$;

create or replace function commute.stats(p_secret text) returns jsonb
language plpgsql security definer
set search_path = commute
as $$
declare
  v_total int;
  v_paired int;
  v_recent_avg numeric;
  v_unpaired int;
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;

  select count(*) into v_total from commute.events;
  select count(*) into v_paired from commute.durations;
  select round(avg(duration_min)::numeric, 1) into v_recent_avg
    from commute.durations
    where board_at >= now() - interval '7 days';
  select count(*) into v_unpaired
    from commute.events b
    where b.event = 'board'
      and b.local_date < (now() at time zone 'Asia/Taipei')::date
      and not exists (
        select 1 from commute.events a
        where a.local_date = b.local_date
          and a.direction  = b.direction
          and a.event      = 'alight'
          and a.event_at   > b.event_at
      );

  return jsonb_build_object(
    'totals', jsonb_build_object(
      'events', v_total,
      'paired', v_paired,
      'avg_7d_min', v_recent_avg,
      'missing_alight', v_unpaired
    ),
    'durations', coalesce((select jsonb_agg(d order by board_at) from commute.durations d), '[]'::jsonb),
    'predictions', coalesce((select jsonb_agg(p) from commute.predictions p), '[]'::jsonb),
    'recent_boardings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'local_date', local_date,
        'local_time', local_time,
        'direction',  direction,
        'weekday',    weekday))
      from (
        select local_date, local_time, direction, weekday
        from commute.events
        where event='board'
        order by event_at desc
        limit 200
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

grant usage on schema commute to anon, authenticated;
grant execute on function commute.log_event(text,text,text,text,numeric,numeric,numeric,text) to anon, authenticated;
grant execute on function commute.list_events(text,int) to anon, authenticated;
grant execute on function commute.delete_event(text,uuid) to anon, authenticated;
grant execute on function commute.update_note(text,uuid,text) to anon, authenticated;
grant execute on function commute.stats(text) to anon, authenticated;
