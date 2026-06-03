-- Expose boarding clock time and temperature on the durations view so the Charts
-- page can plot duration as a function of boarding-time-of-day and temperature.
-- Columns are appended at the end so dependent views (predictions,
-- predictions_weekday) and commute.stats() keep working. stats() aggregates the
-- whole durations row via jsonb_agg(d), so the new fields flow into its payload
-- automatically — no change to stats() required.

create or replace view commute.durations as
select
  b.local_date,
  b.direction,
  b.weekday,
  b.weather as board_weather,
  b.event_at as board_at,
  a.event_at as alight_at,
  extract(epoch from (a.event_at - b.event_at)) / 60.0 as duration_min,
  b.local_time as board_time,      -- boarding clock time (Asia/Taipei)
  b.temp_c     as board_temp_c     -- boarding temperature in °C (nullable)
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
