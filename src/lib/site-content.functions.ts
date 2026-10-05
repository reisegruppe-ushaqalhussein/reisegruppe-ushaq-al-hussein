import { createServerFn } from "@tanstack/react-start";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { hash, storedMatches, verifyRole } from "./roles.server";
import { mergeContent, type SiteContent } from "./site-content";

export type AccessRole = "admin" | "haj";

async function passwordMatches(input: string) {
  return (await verifyRole(input)) !== null;
}

type DeviceRow = { id: string; role: AccessRole; ua: string; firstSeen: number; lastSeen: number };
type FailRow = { ua: string; at: number };

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_settings").select("value").eq("key", key).maybeSingle();
  try { return data?.value ? (JSON.parse(data.value) as T) : fallback; } catch { return fallback; }
}
async function writeJson(key: string, value: unknown) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_settings").upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(async (): Promise<SiteContent> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle();
  return mergeContent(data?.data);
});

export const checkAdminPassword = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), deviceId: z.string().max(100).optional(), ua: z.string().max(300).optional(), login: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    const role = await verifyRole(data.password);
    const now = Date.now();
    try {
      if (role && data.deviceId) {
        const devices = (await readJson<DeviceRow[]>("devices", [])).filter((d) => d.id !== data.deviceId);
        const prev = (await readJson<DeviceRow[]>("devices", [])).find((d) => d.id === data.deviceId);
        devices.push({ id: data.deviceId, role, ua: data.ua ?? "", firstSeen: prev?.firstSeen ?? now, lastSeen: now });
        await writeJson("devices", devices.slice(-50));
      } else if (!role && data.login && data.password) {
        const fails = await readJson<FailRow[]>("failures", []);
        fails.push({ ua: data.ua ?? "", at: now });
        await writeJson("failures", fails.slice(-100));
      }
    } catch (e) { console.error("access log", e); }
    return { ok: role !== null, role };
  });

export const changeAdminPassword = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), newPassword: z.string().min(6).max(200), target: z.enum(["admin", "haj"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    if ((await verifyRole(data.password)) !== "admin") return { ok: false as const };
    const target = data.target ?? "admin";
    const other = target === "admin" ? "haj_password" : "password";
    if ((await storedMatches(other, data.newPassword)) === true) return { ok: false as const };
    const salt = randomBytes(16).toString("hex");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key: target === "admin" ? "password" : "haj_password", value: `${salt}:${hash(data.newPassword, salt)}`, updated_at: new Date().toISOString() });
    if (error) throw new Error("Save failed");
    // Devices of the changed role must sign in again with the new code.
    const devices = await readJson<DeviceRow[]>("devices", []);
    await writeJson("devices", devices.filter((d) => d.role !== target));
    return { ok: true as const };
  });

export const getSecurityOverview = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    if ((await verifyRole(data.password)) !== "admin") return { ok: false as const, devices: [] as DeviceRow[], failures: [] as FailRow[], hajSet: false };
    const devices = await readJson<DeviceRow[]>("devices", []);
    const failures = await readJson<FailRow[]>("failures", []);
    const hajSet = (await storedMatches("haj_password", "\u0000")) !== null;
    return { ok: true as const, devices: devices.sort((a, b) => b.lastSeen - a.lastSeen), failures: failures.slice(-30).reverse(), hajSet };
  });

export const clearSecurityLog = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), what: z.enum(["failures", "devices"]) }).parse(d))
  .handler(async ({ data }) => {
    if ((await verifyRole(data.password)) !== "admin") return { ok: false as const };
    await writeJson(data.what, []);
    return { ok: true as const };
  });

const s = z.string().max(20000);
const long = z.string().max(500000);
const resourceSchema = z.object({ id: z.string().max(100), ar: s, de: s, en: s.optional(), textAr: long, textDe: long, textEn: long.optional(), pdfUrl: z.string().max(5000).optional(), audioUrl: z.string().max(5000).optional(), place: z.string().max(100).optional(), hidden: z.boolean().optional() });
const contentSchema = z.object({
  trips: z.array(z.object({ id: z.string().max(100), ar: s, de: s, date: s, visible: z.boolean(), hidden: z.boolean().optional(), statusAr: s.optional(), statusDe: s.optional(), programAr: long.optional(), programDe: long.optional(), descAr: long.optional(), descDe: long.optional() })).max(200),
  hotels: z.object({ kadhimiya: s, karbala: s, najaf: s }),
  program: z.object({ ar: long, de: long }),
  visa: z.object({ eu: long, nonEu: long, airportsAr: long.optional(), airportsDe: long.optional() }),
  payment: z.object({ visible: z.boolean(), accountName: s, bankName: s, iban: s, bic: s }),
  news: z.array(z.object({ ar: s, de: s, bodyAr: long, bodyDe: long, hidden: z.boolean().optional() })).max(500),
  duas: z.array(z.object({ id: z.string().max(100), ar: s, de: s, textAr: long, textDe: long, textEn: long.optional(), link: z.string().max(5000), hidden: z.boolean().optional(), category: z.string().max(100).optional(), reciters: z.array(z.object({ name: s, url: z.string().max(5000) })).max(50).optional() })).max(1000),
  alert: z.object({ ar: s, de: s, active: z.boolean() }),
  contacts: z.array(z.object({ id: z.string().max(100), ar: s, de: s, roleAr: s, roleDe: s, phone: z.string().max(100), whatsapp: z.string().max(2000), visible: z.boolean().optional(), hidden: z.boolean().optional() })).max(100),
  contactsVisible: z.boolean(),
  itinerary: z.array(z.object({ id: z.string().max(100), date: z.string().max(20), time: z.string().max(20), titleAr: s, titleDe: s, place: s, notes: long, gathering: z.boolean(), hidden: z.boolean().optional() })).max(1000),
  locations: z.array(z.object({ id: z.string().max(100), kind: z.enum(["hotel", "shrine", "gathering"]), ar: s, de: s, address: s, mapsUrl: z.string().max(5000), hidden: z.boolean().optional() })).max(300),
  faqs: z.array(z.object({ id: z.string().max(100), qAr: s, qDe: s, qEn: s.optional(), aAr: long, aDe: long, aEn: long.optional(), hidden: z.boolean().optional() })).max(300),
  occasions: z.array(resourceSchema).max(500),
  hadiths: z.array(resourceSchema).max(1000),
  tripTypes: z.array(z.object({ id: z.string().max(100), ar: s, de: s, statusAr: s, statusDe: s, hidden: z.boolean().optional() })).max(100).optional(),
  shrines: z.array(z.object({ id: z.string().max(100), ar: s, de: s, imageUrl: z.string().max(5000).optional(), hidden: z.boolean().optional() })).max(100).optional(),
  visaNotes: z.array(z.object({ id: z.string().max(100), ar: long, de: long, hidden: z.boolean().optional() })).max(200).optional(),
  emergency: z.array(z.object({ id: z.string().max(100), ar: s, de: s, phone: z.string().max(100), hidden: z.boolean().optional() })).max(100).optional(),
  donations: z.array(z.object({ id: z.string().max(100), ar: long, de: long, value: s, hidden: z.boolean().optional() })).max(100).optional(),
  donationIntro: z.object({ ar: long, de: long }).optional(),
  memories: z.array(z.object({ id: z.string().max(100), imageUrl: z.string().max(5000), ar: s, de: s, place: s, date: z.string().max(20), hidden: z.boolean().optional() })).max(500).optional(),
  reviewUrl: z.string().max(2000).optional(),
  rooms: z.array(z.object({ id: z.string().max(100), name: s, city: s, hotel: s, floor: z.string().max(50), room: z.string().max(50), hidden: z.boolean().optional() })).max(2000).optional(),
  guidelines: z.array(z.object({ id: z.string().max(100), ar: long, de: long, destAr: s.optional(), destDe: s.optional(), pdf: z.string().max(5000).optional(), images: z.string().max(50000).optional(), hidden: z.boolean().optional() })).max(200).optional(),
  guidelinesPdf: z.string().max(5000).optional(),
  iraqItems: z.array(z.object({ id: z.string().max(100), kind: z.string().max(20), ar: s, de: s, bodyAr: long, bodyDe: long, hidden: z.boolean().optional() })).max(200).optional(),
  labels: z.record(z.string().max(100), z.object({ ar: s, de: s, hidden: z.boolean().optional() })).optional(),
  trash: z.array(z.unknown()).max(300).optional(),
  modeLabels: z.object({ admin: z.string().max(60), haj: z.string().max(60), leader: z.string().max(60) }).optional(),
  cms: z.record(z.string(), z.unknown()).optional(),
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
      .upsert({ id: "main", data: parsed.data as never, updated_at: new Date().toISOString() });
    if (error) {
      console.error("saveSiteContent db", error);
      return { ok: false as const, error: `DB: ${error.message}${error.details ? ` (${error.details})` : ""}` };
    }
    return { ok: true as const };
  });

export const registerPushToken = createServerFn({ method: "POST" })
  .validator((d) => z.object({ token: z.string().min(20).max(4096), password: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const staff = data.password ? (await verifyRole(data.password)) !== null : false;
    const { error } = await supabaseAdmin.from("push_tokens").upsert(staff ? { token: data.token, staff: true } : { token: data.token });
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

/** Translates short Arabic UI labels to German for the admin (fills missing German automatically). */
export const translateLabels = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), texts: z.array(z.string().max(500)).max(50) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password)) || !data.texts.length) return { ok: false as const, out: [] as string[] };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, out: [] as string[] };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Translate each Arabic UI label to short natural German. Reply ONLY with a JSON array of strings, same order and length." },
            { role: "user", content: JSON.stringify(data.texts) },
          ],
        }),
      });
      if (!res.ok) return { ok: false as const, out: [] as string[] };
      const j = await res.json();
      const txt: string = j.choices?.[0]?.message?.content ?? "";
      const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1));
      return Array.isArray(arr) && arr.length === data.texts.length ? { ok: true as const, out: arr.map(String) } : { ok: false as const, out: [] as string[] };
    } catch { return { ok: false as const, out: [] as string[] }; }
  });

export const createUploadUrl = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), name: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password))) throw new Error("Falsches Passwort / كلمة المرور غير صحيحة");
    const ext = (data.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const path = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage.from("resources").createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload failed");
    return { path, token: signed.token };
  });

/** Long-lived (10 years) read link for an uploaded file in the private bucket. */
export const signMediaUrl = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), path: z.string().regex(/^[\w.-]{1,120}$/) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verifyRole(data.password))) throw new Error("Falsches Passwort / كلمة المرور غير صحيحة");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s, error } = await supabaseAdmin.storage.from("resources").createSignedUrl(data.path, 60 * 60 * 24 * 365 * 10);
    if (error || !s) throw new Error(error?.message ?? "Sign failed");
    return { url: s.signedUrl };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((d) => z.object({ ratingCampaign: z.number().int().min(1).max(5), ratingApp: z.number().int().min(1).max(5), recommend: z.boolean().nullable(), liked: z.string().max(3000), improve: z.string().max(3000), name: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("feedback").insert({ rating_campaign: data.ratingCampaign, rating_app: data.ratingApp, recommend: data.recommend, liked: data.liked, improve: data.improve, name: data.name });
    if (error) throw new Error("Save failed");
    return { ok: true };
  });

export const listFeedback = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password))) return { ok: false as const, rows: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("feedback").select("*").order("created_at", { ascending: false }).limit(300);
    return { ok: true as const, rows: rows ?? [] };
  });

/* ---------- Pilgrim ID approval ---------- */
export type IdField = { id: string; ar: string; de: string };
export type IdStatus = "pending" | "approved" | "rejected";
export type IdRequest = { id: string; at: number; status: IdStatus; auto?: boolean; nameAr: string; nameDe: string; phone: string; extra: Record<string, string>; stays: { city: string; hotel: string; floor: string; room: string }[] };
const t = z.string().max(500);

export const getIdFields = createServerFn({ method: "GET" }).handler(async () => readJson<IdField[]>("id_fields", []));

export const saveIdFields = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), fields: z.array(z.object({ id: z.string().max(100), ar: t, de: t })).max(30) }).parse(d))
  .handler(async ({ data }) => {
    if ((await verifyRole(data.password)) !== "admin") return { ok: false };
    await writeJson("id_fields", data.fields);
    return { ok: true };
  });

export type IdSettings = { open: boolean; emergencyPublic: boolean; emTitleAr: string; emTitleDe: string; emNoteAr: string; emNoteDe: string; titleAr?: string; titleDe?: string; lockAr?: string; lockDe?: string; labels?: Record<string, string> };
const idSettingsDefault: IdSettings = { open: false, emergencyPublic: false, emTitleAr: "", emTitleDe: "", emNoteAr: "", emNoteDe: "" };
export const getIdSettings = createServerFn({ method: "GET" }).handler(async () => ({ ...idSettingsDefault, ...(await readJson<Partial<IdSettings>>("id_settings", {})) }));
export const saveIdSettings = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), settings: z.object({ open: z.boolean(), emergencyPublic: z.boolean(), emTitleAr: t, emTitleDe: t, emNoteAr: z.string().max(1000), emNoteDe: z.string().max(1000), titleAr: t.optional(), titleDe: t.optional(), lockAr: z.string().max(1000).optional(), lockDe: z.string().max(1000).optional(), labels: z.record(z.string().max(50), t).optional() }) }).parse(d))
  .handler(async ({ data }) => {
    if ((await verifyRole(data.password)) !== "admin") return { ok: false };
    await writeJson("id_settings", data.settings);
    return { ok: true };
  });

const normName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const submitIdRequest = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().min(8).max(100), nameAr: t, nameDe: t, phone: t, extra: z.record(z.string().max(100), t), stays: z.array(z.object({ city: t, hotel: t, floor: t, room: t })).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const list = await readJson<IdRequest[]>("id_requests", []);
    const existing = list.find((r) => r.id === data.id);
    const settings = { ...idSettingsDefault, ...(await readJson<Partial<IdSettings>>("id_settings", {})) };
    if (!settings.open && !existing) return { ok: false, closed: true, status: null as IdStatus | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row0 } = await supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle();
    const rooms = mergeContent(row0?.data).rooms ?? [];
    const names = [data.nameAr, data.nameDe].map(normName).filter(Boolean);
    const match = names.length > 0 && rooms.some((r) => !r.hidden && names.includes(normName(r.name)));
    const status: IdStatus = match ? "approved" : "pending";
    const row: IdRequest = { ...data, at: Date.now(), status, auto: match };
    await writeJson("id_requests", [row, ...list.filter((r) => r.id !== data.id)].slice(0, 1000));
    return { ok: true, closed: false, status };
  });

export const getIdStatus = createServerFn({ method: "POST" })
  .validator((d) => z.object({ id: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const list = await readJson<IdRequest[]>("id_requests", []);
    return { status: (list.find((r) => r.id === data.id)?.status ?? null) as IdStatus | null };
  });

export const listIdRequests = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verifyRole(data.password))) return { ok: false, rows: [] as IdRequest[] };
    return { ok: true, rows: await readJson<IdRequest[]>("id_requests", []) };
  });

export const decideIdRequest = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), id: z.string().max(100), status: z.enum(["approved", "rejected", "delete"]) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await verifyRole(data.password))) return { ok: false };
    const list = await readJson<IdRequest[]>("id_requests", []);
    await writeJson("id_requests", data.status === "delete" ? list.filter((r) => r.id !== data.id) : list.map((r) => r.id === data.id ? { ...r, status: data.status as IdStatus } : r));
    return { ok: true };
  });

/** Public: translates any German/Arabic app text to English (results are cached on each device). */
export const translateToEnglish = createServerFn({ method: "POST" })
  .validator((d) => z.object({ texts: z.array(z.string().max(1500)).min(1).max(40), target: z.enum(["en", "de"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, out: [] as string[] };
    const target = data.target === "de" ? "German" : "English";
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: `You translate texts of a Shia pilgrimage travel group app into natural ${target}. Inputs are German or Arabic. Keep names, numbers, emojis, line breaks and religious terms (Ziyarat, Imam, Hajj, (as)) intact. Reply ONLY with a JSON array of strings, same order and length.` },
            { role: "user", content: JSON.stringify(data.texts) },
          ],
        }),
      });
      if (!res.ok) return { ok: false as const, out: [] as string[] };
      const j = await res.json();
      const txt: string = j.choices?.[0]?.message?.content ?? "";
      const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1));
      return Array.isArray(arr) && arr.length === data.texts.length ? { ok: true as const, out: arr.map(String) } : { ok: false as const, out: [] as string[] };
    } catch { return { ok: false as const, out: [] as string[] }; }
  });
