create or replace function commute.update_weather(
  p_secret  text,
  p_id      uuid,
  p_weather text,
  p_temp_c  numeric default null,
  p_lat     numeric default null,
  p_lon     numeric default null
) returns void
language plpgsql security definer
set search_path = commute
as $$
declare
  v_rows int;
begin
  if not commute.check_secret(p_secret) then
    raise exception 'unauthorized' using errcode='42501';
  end if;
  if p_weather is null then
    raise exception 'invalid weather' using errcode='22023';
  end if;
  update commute.events
     set weather = p_weather,
         temp_c  = p_temp_c,
         lat     = coalesce(p_lat, lat),
         lon     = coalesce(p_lon, lon)
   where id = p_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'event not found' using errcode='P0002';
  end if;
end;
$$;
