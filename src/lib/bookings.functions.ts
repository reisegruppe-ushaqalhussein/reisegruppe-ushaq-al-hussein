import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const latin = z.string().trim().min(1).max(80).regex(/^[A-Za-z][A-Za-z '\-]*$/, "Latin letters only");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fileSchema = z.object({ name: z.string().max(200), type: z.string().max(100), data: z.string().max(14_000_000) }).optional();

const travelerSchema = z.object({
  category: z.enum(["adult", "child", "infant"]),
  relation: z.string().max(60),
  firstName: latin,
  lastName: latin,
  gender: z.enum(["m", "f"]),
  birthDate: date,
  nationality: z.string().trim().min(2).max(60),
  passportNo: z.string().trim().min(5).max(20).regex(/^[A-Za-z0-9]+$/),
  passportExpiry: date,
  passportFile: fileSchema,
  photoFile: fileSchema,
});

const bookingSchema = z.object({
  trip: z.string().trim().min(1).max(200),
  tripDate: z.string().trim().max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30).regex(/^[+0-9 ()-]+$/),
  roomPref: z.string().max(40),
  notes: z.string().max(2000),
  travelers: z.array(travelerSchema).min(1).max(15),
  consent: z.literal(true),
});

const CAMPAIGN_EMAIL = "ushaqalhussein.contact@gmail.com";
const catLabel = { adult: "بالغ | Erwachsener (12+)", child: "طفل | Kind (2–11)", infant: "رضيع | Kleinkind (<2)" } as const;

function b64(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}
function header(v: string) {
  return /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`;
}
async function sendMail(to: string, subject: string, body: string, replyTo?: string) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const gmail = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovable || !gmail) return false;
  const raw = [
    `From: ${header("حملة عشاق الحسين | Ushaq al-Hussein")} <${CAMPAIGN_EMAIL}>`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(body),
  ].join("\r\n");
  const res = await fetch("https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": gmail, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(raw, "utf8").toString("base64url") }),
  });
  if (!res.ok) console.error(`Gmail send failed [${res.status}]: ${await res.text()}`);
  return res.ok;
}

async function pushStaff(title: string, body: string) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const fcm = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovable || !fcm) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("push_tokens").select("token").eq("staff", true).limit(50);
  const stale: string[] = [];
  await Promise.all((data ?? []).map(async ({ token }) => {
    const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": fcm, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token, notification: { title, body }, webpush: { fcm_options: { link: "/" }, headers: { Urgency: "high" } } } }),
    });
    if (!res.ok) { const t = await res.text(); if (res.status === 404 || res.status === 400) stale.push(token); else console.error(`FCM [${res.status}]: ${t}`); }
  }));
  if (stale.length) await supabaseAdmin.from("push_tokens").delete().in("token", stale);
}

async function isStaff(password: string) {
  const { verifyRole } = await import("./site-content.functions");
  return (await verifyRole(password)) !== null;
}

export const submitBooking = createServerFn({ method: "POST" })
  .validator((d) => bookingSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = `UH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const travelers = [];
    for (const [i, t] of data.travelers.entries()) {
      const files: Record<string, string> = {};
      for (const key of ["passportFile", "photoFile"] as const) {
        const f = t[key];
        if (!f?.data) continue;
        const ext = (f.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
        const path = `${ref}/${i + 1}-${key === "passportFile" ? "passport" : "photo"}.${ext}`;
        const { error } = await supabaseAdmin.storage.from("booking-docs").upload(path, Buffer.from(f.data, "base64"), { contentType: f.type || "application/octet-stream", upsert: true });
        if (error) throw new Error(`Upload: ${error.message}`);
        files[key] = path;
      }
      const { passportFile: _p, photoFile: _f, ...rest } = t;
      travelers.push({ ...rest, firstName: rest.firstName.toUpperCase(), lastName: rest.lastName.toUpperCase(), passportNo: rest.passportNo.toUpperCase(), ...files });
    }
    const { error } = await supabaseAdmin.from("bookings").insert({
      ref, trip: data.trip, trip_date: data.tripDate, contact_email: data.email, contact_phone: data.phone,
      room_pref: data.roomPref, notes: data.notes, travelers: travelers as never,
    });
    if (error) throw new Error(error.message);

    const lead = travelers[0]!;
    const counts = { adult: 0, child: 0, infant: 0 };
    travelers.forEach((t) => { counts[t.category]++; });
    const list = travelers.map((t, i) => `${i + 1}. ${t.lastName}/${t.firstName} — ${catLabel[t.category]} — ${t.birthDate} — Pass ${t.passportNo} (${t.passportExpiry}) — ${t.nationality}${t.relation ? ` — ${t.relation}` : ""}`).join("\n");
    const summary = `الرحلة | Reise: ${data.trip}${data.tripDate ? ` — ${data.tripDate}` : ""}\nالمسافرون | Reisende: ${travelers.length} (بالغ/Erw. ${counts.adult}, طفل/Kind ${counts.child}, رضيع/Kleinkind ${counts.infant})\n\n${list}\n\nالغرفة | Zimmer: ${data.roomPref || "-"}\nملاحظات | Notizen: ${data.notes || "-"}`;

    await Promise.allSettled([
      pushStaff(`🔔 حجز جديد ${ref}`, `${lead.firstName} ${lead.lastName} — ${data.trip} — ${travelers.length} مسافر`),
      sendMail(CAMPAIGN_EMAIL, `حجز جديد | Neue Buchung ${ref} — ${lead.lastName}`, `${summary}\n\nالإيميل | E-Mail: ${data.email}\nالهاتف | Telefon: ${data.phone}`, data.email),
      sendMail(data.email, `تأكيد استلام طلبكم | Eingangsbestätigung ${ref}`,
        `السلام عليكم ${lead.firstName} ${lead.lastName}،\n\nتم استلام طلب تسجيلكم بنجاح. رقم الطلب: ${ref}\nهذا تأكيد استلام فقط وليس تأكيداً نهائياً للحجز. ستتواصل معكم إدارة الحملة عبر الواتساب لإتمام التأشيرات وتأكيد المقاعد.\n\nGuten Tag ${lead.firstName} ${lead.lastName},\n\nIhre Anmeldung ist bei uns eingegangen. Buchungsnummer: ${ref}\nDies ist nur eine Eingangsbestätigung, keine endgültige Buchung. Die Reiseleitung meldet sich per WhatsApp für Visum und Platzbestätigung.\n\n${summary}\n\nحملة عشاق الحسين - ألمانيا | Reisegruppe Ushaq al-Hussein\nبإدارة الحاج ياسر الدر | Geleitet von Hajj Yasser Aldor\n${CAMPAIGN_EMAIL}`),
    ]);
    return { ok: true as const, ref };
  });

export type BookingRow = { id: string; ref: string; created_at: string; trip: string; trip_date: string | null; contact_email: string; contact_phone: string; room_pref: string | null; notes: string | null; travelers: Array<Record<string, string>>; status: string; payment_status: string; paid_amount: number; total_amount: number; admin_notes: string | null };

export const listBookings = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isStaff(data.password))) return { ok: false as const, rows: [] as BookingRow[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("bookings").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { ok: true as const, rows: (rows ?? []) as unknown as BookingRow[] };
  });

export const updateBooking = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    password: z.string().max(200), id: z.string().uuid(),
    status: z.enum(["new", "confirmed", "cancelled"]).optional(),
    payment_status: z.enum(["unpaid", "partial", "paid"]).optional(),
    paid_amount: z.number().min(0).max(1_000_000).optional(),
    total_amount: z.number().min(0).max(1_000_000).optional(),
    admin_notes: z.string().max(2000).optional(),
    remove: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isStaff(data.password))) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _p, id, remove, ...patch } = data;
    const q = remove ? supabaseAdmin.from("bookings").delete().eq("id", id) : supabaseAdmin.from("bookings").update(Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as never).eq("id", id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const bookingFileUrl = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), path: z.string().max(300) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isStaff(data.password))) return { ok: false as const, url: "" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s, error } = await supabaseAdmin.storage.from("booking-docs").createSignedUrl(data.path, 600);
    if (error) throw new Error(error.message);
    return { ok: true as const, url: s.signedUrl };
  });
