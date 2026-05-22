import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "REMINDER_CRON_SECRET",
] as const;
const missing = REQUIRED_ENV.filter((k) => !Deno.env.get(k));

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const CRON_SECRET = Deno.env.get("REMINDER_CRON_SECRET") ?? "";

if (missing.length === 0) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const supabase = missing.length === 0
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      db: { schema: "commute" },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const BODY_BY_DIRECTION: Record<string, string> = {
  to_work: "上班的「上車」已記錄 40 分鐘了。",
  from_work: "下班的「上車」已記錄 40 分鐘了。",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (missing.length > 0 || !supabase) {
    return json(500, { error: "missing env vars", missing });
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${CRON_SECRET}`) return json(401, { error: "unauthorized" });

  const { data: pending, error: listErr } = await supabase.rpc("list_pending_reminders");
  if (listErr) return json(500, { error: listErr.message, stage: "list_pending" });
  if (!pending || pending.length === 0) return json(200, { sent: 0, pending: 0 });

  const { data: subs, error: subsErr } = await supabase.rpc("list_push_subscriptions");
  if (subsErr) return json(500, { error: subsErr.message, stage: "list_subs" });
  // No subscriptions = nothing to do, but DON'T mark reminders sent —
  // the user may subscribe shortly and we want the next cron tick to deliver
  // (within the 120-minute event window).
  if (!subs || subs.length === 0) return json(200, { sent: 0, pending: pending.length, note: "no subscriptions" });

  let sent = 0;
  let marked = 0;
  let removed = 0;
  const failures: Array<{ endpoint: string; code: number }> = [];

  for (const ev of pending as Array<{ id: string; direction: string }>) {
    const payload = JSON.stringify({
      title: "別忘了按下車",
      body: BODY_BY_DIRECTION[ev.direction] ?? "記得按下車",
      tag: `commute-remind-${ev.id}`,
      url: "/index.html",
    });

    let eventDelivered = 0;
    for (const sub of subs as Array<{ endpoint: string; p256dh: string; auth: string }>) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 30 },
        );
        sent++;
        eventDelivered++;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode ?? 0;
        if (code === 404 || code === 410) {
          await supabase.rpc("delete_push_subscription_by_endpoint", { p_endpoint: sub.endpoint });
          removed++;
        } else {
          failures.push({ endpoint: sub.endpoint, code });
          console.error("[send-reminders] push failed", code, (err as Error)?.message);
        }
      }
    }

    // Only mark sent when at least one push succeeded. Transient failures
    // (e.g. all endpoints 5xx for this tick) leave reminder_sent_at NULL
    // so the next minute's cron retries — until the 120-min window closes.
    if (eventDelivered > 0) {
      const { error: markErr } = await supabase.rpc("mark_reminder_sent", { p_id: ev.id });
      if (markErr) {
        console.error("[send-reminders] mark_reminder_sent failed", ev.id, markErr.message);
      } else {
        marked++;
      }
    }
  }

  return json(200, { sent, marked, removed, pending: pending.length, failures });
});
