import { createServerFn } from "@tanstack/react-start";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mergeContent, type SiteContent } from "./site-content";

function hash(input: string, salt: string) {
  return createHash("sha256").update(salt + input, "utf8").digest("hex");
}

async function passwordMatches(input: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_settings").select("value").eq("key", "password").maybeSingle();
  if (data?.value) {
    const [salt, stored] = data.value.split(":");
    if (!salt || !stored) return false;
    const a = Buffer.from(hash(input, salt), "hex");
    const b = Buffer.from(stored, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(async (): Promise<SiteContent> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle();
  return mergeContent(data?.data);
});

export const checkAdminPassword = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => ({ ok: await passwordMatches(data.password) }));

export const changeAdminPassword = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), newPassword: z.string().min(6).max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password))) return { ok: false as const };
    const salt = randomBytes(16).toString("hex");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: "password", value: `${salt}:${hash(data.newPassword, salt)}`, updated_at: new Date().toISOString() });
    if (error) throw new Error("Save failed");
    return { ok: true as const };
  });

const s = z.string().max(20000);
const long = z.string().max(500000);
const contentSchema = z.object({
  trips: z.array(z.object({ id: z.string().max(100), ar: s, de: s, date: s, visible: z.boolean(), hidden: z.boolean().optional(), statusAr: s.optional(), statusDe: s.optional(), descAr: long.optional(), descDe: long.optional() })).max(200),
  hotels: z.object({ kadhimiya: s, karbala: s, najaf: s }),
  program: z.object({ ar: long, de: long }),
  visa: z.object({ eu: long, nonEu: long }),
  payment: z.object({ visible: z.boolean(), accountName: s, bankName: s, iban: s, bic: s }),
  news: z.array(z.object({ ar: s, de: s, bodyAr: long, bodyDe: long, hidden: z.boolean().optional() })).max(500),
  duas: z.array(z.object({ id: z.string().max(100), ar: s, de: s, textAr: long, textDe: long, link: z.string().max(5000), hidden: z.boolean().optional(), category: z.enum(["karbala", "najaf", "kazimiyya", "samarra", "mashhad", "qom", "mecca-medina", "general"]).optional(), reciters: z.array(z.object({ name: s, url: z.string().max(5000) })).max(50).optional() })).max(1000),
  alert: z.object({ ar: s, de: s, active: z.boolean() }),
  contacts: z.array(z.object({ id: z.string().max(100), ar: s, de: s, roleAr: s, roleDe: s, phone: z.string().max(100), whatsapp: z.string().max(2000), visible: z.boolean().optional(), hidden: z.boolean().optional() })).max(100),
  contactsVisible: z.boolean(),
  itinerary: z.array(z.object({ id: z.string().max(100), date: z.string().max(20), time: z.string().max(20), titleAr: s, titleDe: s, place: s, notes: long, gathering: z.boolean(), hidden: z.boolean().optional() })).max(1000),
  locations: z.array(z.object({ id: z.string().max(100), kind: z.enum(["hotel", "shrine", "gathering"]), ar: s, de: s, address: s, mapsUrl: z.string().max(5000), hidden: z.boolean().optional() })).max(300),
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), content: z.unknown() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password))) return { ok: false as const, error: "Falsches Passwort / كلمة المرور غير صحيحة" };
    const parsed = contentSchema.safeParse(data.content);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      console.error("saveSiteContent validation", msg);
      return { ok: false as const, error: `Validation: ${msg}` };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", data: parsed.data, updated_at: new Date().toISOString() });
    if (error) {
      console.error("saveSiteContent db", error);
      return { ok: false as const, error: `DB: ${error.message}${error.details ? ` (${error.details})` : ""}` };
    }
    return { ok: true as const };
  });

export const registerPushToken = createServerFn({ method: "POST" })
  .validator((d) => z.object({ token: z.string().min(20).max(4096) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_tokens").upsert({ token: data.token });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendAlertPush = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), title: z.string().max(200), body: z.string().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password))) return { ok: false as const, sent: 0, error: "Falsches Passwort / كلمة المرور غير صحيحة" };
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !fcmKey) return { ok: false as const, sent: 0, error: "Push not configured" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("token").limit(5000);
    const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": fcmKey, "Content-Type": "application/json" };
    let sent = 0;
    const stale: string[] = [];
    const tokens = (rows ?? []).map((r) => r.token);
    for (let i = 0; i < tokens.length; i += 20) {
      await Promise.all(tokens.slice(i, i + 20).map(async (token) => {
        const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
          method: "POST", headers,
          body: JSON.stringify({ message: { token, notification: { title: data.title, body: data.body }, webpush: { fcm_options: { link: "/" } } } }),
        });
        if (res.ok) { sent++; return; }
        const txt = await res.text();
        if (res.status === 404 || res.status === 400) stale.push(token);
        else console.error(`FCM send failed [${res.status}]: ${txt}`);
      }));
    }
    if (stale.length) await supabaseAdmin.from("push_tokens").delete().in("token", stale);
    return { ok: true as const, sent };
  });
