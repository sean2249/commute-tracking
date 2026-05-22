drop function if exists commute.claim_pending_reminders();

create or replace function commute.list_pending_reminders()
returns table (
  id         uuid,
  direction  text,
  event_at   timestamptz,
  local_date date
)
language sql security definer
set search_path = commute
stable
as $$
  select b.id, b.direction, b.event_at, b.local_date
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
    );
$$;

revoke all on function commute.list_pending_reminders() from public;
revoke all on function commute.list_pending_reminders() from anon, authenticated;
grant execute on function commute.list_pending_reminders() to service_role;

create or replace function commute.mark_reminder_sent(p_id uuid)
returns void
language plpgsql security definer
set search_path = commute
as $$
begin
  update commute.events
  set reminder_sent_at = now()
  where id = p_id
    and event = 'board'
    and reminder_sent_at is null;
end;
$$;

revoke all on function commute.mark_reminder_sent(uuid) from public;
revoke all on function commute.mark_reminder_sent(uuid) from anon, authenticated;
grant execute on function commute.mark_reminder_sent(uuid) to service_role;
