import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const CRON_SECRET = Deno.env.get("REMINDER_CRON_SECRET") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: "commute" },
  auth: { persistSession: false, autoRefreshToken: false },
});

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
  if (!CRON_SECRET) return json(500, { error: "REMINDER_CRON_SECRET not configured" });
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${CRON_SECRET}`) return json(401, { error: "unauthorized" });

  const { data: pending, error: claimErr } = await supabase.rpc("claim_pending_reminders");
  if (claimErr) return json(500, { error: claimErr.message, stage: "claim" });
  if (!pending || pending.length === 0) return json(200, { sent: 0, pending: 0 });

  const { data: subs, error: subsErr } = await supabase.rpc("list_push_subscriptions");
  if (subsErr) return json(500, { error: subsErr.message, stage: "list_subs" });
  if (!subs || subs.length === 0) return json(200, { sent: 0, pending: pending.length, note: "no subscriptions" });

  let sent = 0;
  let removed = 0;
  const failures: Array<{ endpoint: string; code: number }> = [];

  for (const ev of pending as Array<{ id: string; direction: string }>) {
    const payload = JSON.stringify({
      title: "別忘了按下車",
      body: BODY_BY_DIRECTION[ev.direction] ?? "記得按下車",
      tag: `commute-remind-${ev.id}`,
      url: "/index.html",
    });

    for (const sub of subs as Array<{ endpoint: string; p256dh: string; auth: string }>) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 30 },
        );
        sent++;
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
  }

  return json(200, { sent, removed, pending: pending.length, failures });
});
