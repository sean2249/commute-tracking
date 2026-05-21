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
  v_now        timestamptz := now();
  v_local      timestamp   := (v_now at time zone 'Asia/Taipei');
  v_weekday    smallint    := extract(isodow from v_local)::smallint;
  v_date       date        := v_local::date;
  v_time       time        := v_local::time;
  v_id         uuid;
  v_pred       record;
  v_src        text        := null;
  v_prediction jsonb       := null;
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

    if v_src is not null then
      v_prediction := jsonb_build_object(
        'median_min', v_pred.median_min,
        'p90_min',    v_pred.p90_min,
        'n',          v_pred.n,
        'source',     v_src
      );
    end if;
  end if;

  return jsonb_build_object(
    'id', v_id,
    'logged_at', v_now,
    'local_date', v_date,
    'local_time', v_time,
    'weekday', v_weekday,
    'prediction', v_prediction
  );
end;
$$;
