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
end;
$$;

grant execute on function commute.update_weather(text,uuid,text,numeric,numeric,numeric) to anon, authenticated;
