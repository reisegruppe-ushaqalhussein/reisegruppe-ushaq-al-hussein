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
  arabicName: z.string().trim().max(120).default(""),
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
  tripId: z.string().trim().max(100).optional(),
  tripDate: z.string().trim().max(100),
  airport: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30).regex(/^[+0-9 ()-]+$/),
  roomPref: z.string().max(40),
  notes: z.string().max(2000),
  travelers: z.array(travelerSchema).min(1).max(15),
  consent: z.literal(true),
});

const CAMPAIGN_EMAIL = "ushaqalhussein.contact@gmail.com";

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
    `From: Reisegruppe Ushaq al-Hussein DE <${CAMPAIGN_EMAIL}>`,
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
  const { verifyRole } = await import("./roles.server");
  return (await verifyRole(password)) !== null;
}

export const submitBooking = createServerFn({ method: "POST" })
  .validator((d) => bookingSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sc } = await supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle();
    const site = (sc?.data ?? {}) as { cms?: { registration?: { closed?: boolean } }; trips?: Array<{ id: string; ar: string; de: string; date?: string }> };
    const reg = site.cms?.registration;
    if (reg?.closed) throw new Error("Registration closed / التسجيل مغلق حالياً");
    const selectedTrip = data.tripId ? site.trips?.find((t) => t.id === data.tripId) : undefined;
    const canonicalTrip = selectedTrip ? [selectedTrip.ar, selectedTrip.de].filter(Boolean).join(" | ") : data.trip;
    const canonicalDate = selectedTrip?.date ?? data.tripDate;
    const canonicalTripId = selectedTrip?.id ?? null;
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
      travelers.push({ ...rest, airport: data.airport, firstName: rest.firstName.toUpperCase(), lastName: rest.lastName.toUpperCase(), passportNo: rest.passportNo.toUpperCase(), ...files });
    }
    const { error } = await supabaseAdmin.from("bookings").insert({
      ref, trip: canonicalTrip, trip_id: canonicalTripId, trip_date: canonicalDate, contact_email: data.email, contact_phone: data.phone,
      room_pref: data.roomPref, notes: data.notes, travelers: travelers as never,
    });
    if (error) throw new Error(error.message);

    const lead = travelers[0]!;
    const counts = { adult: 0, child: 0, infant: 0 };
    travelers.forEach((t) => { counts[t.category]++; });
    const air = data.airport || "-";
    const list = travelers.map((t, i) => `${i + 1}. ${t.lastName}/${t.firstName} — ${t.category.toUpperCase()} — ${t.birthDate} — Pass ${t.passportNo} (${t.passportExpiry}) — ${t.nationality}${t.relation ? ` — ${t.relation}` : ""}`).join("\n");
    const sumDe = `Reise: ${canonicalTrip}${canonicalDate ? ` — ${canonicalDate}` : ""}\nAbflughafen: ${air}\nReisende: ${travelers.length} (Erwachsene ${counts.adult}, Kinder ${counts.child}, Kleinkinder ${counts.infant})\n\n${list}\n\nZimmerwunsch: ${data.roomPref || "-"}\nHinweise: ${data.notes || "-"}`;
    const sumAr = `الرحلة: ${canonicalTrip}${canonicalDate ? ` — ${canonicalDate}` : ""}\nمطار الانطلاق: ${air}\nعدد المسافرين: ${travelers.length} (بالغ ${counts.adult}، طفل ${counts.child}، رضيع ${counts.infant})\n\nتفضيل الغرفة: ${data.roomPref || "-"}\nملاحظات: ${data.notes || "-"}`;
    const sep = "\n\n────────────────────────\n\n";
    const sigDe = `Reisegruppe Ushaq al-Hussein DE\nGeleitet von Hajj Yasser Aldor\n${CAMPAIGN_EMAIL}`;
    const sigAr = `حملة عشاق الحسين - ألمانيا\nبإدارة الحاج ياسر الدر\n${CAMPAIGN_EMAIL}`;
    const name = `${lead.firstName} ${lead.lastName}`;
    const de = `Guten Tag ${name},\n\nIhre Anmeldung ist bei uns eingegangen.\nBuchungsnummer: ${ref}\n\nDies ist nur eine Eingangsbestätigung, keine endgültige Buchung. Die Reiseleitung meldet sich per WhatsApp für Visum und Platzbestätigung.\n\n${sumDe}\n\nMit freundlichen Grüßen\n${sigDe}`;
    const ar = `السلام عليكم ${name}،\n\nتم استلام طلب تسجيلكم بنجاح.\nرقم الطلب: ${ref}\n\nهذا تأكيد استلام فقط وليس تأكيداً نهائياً للحجز. ستتواصل معكم إدارة الحملة عبر الواتساب لإتمام التأشيرات وتأكيد المقاعد.\n\n${sumAr}\n\nمع خالص الدعاء\n${sigAr}`;

    await Promise.allSettled([
      pushStaff(`🔔 حجز جديد ${ref}`, `${name} — ${canonicalTrip} — ${travelers.length} مسافر — ${air}`),
      sendMail(CAMPAIGN_EMAIL, `Neue Buchung | حجز جديد ${ref} — ${lead.lastName}`,
        `حجز جديد — رقم الطلب: ${ref}\n\n${sumAr}\n\nالمسافرون:\n${travelers.map((t, i) => `${i + 1}. ${t.lastName}/${t.firstName} — ${t.category === "infant" ? "رضيع" : t.category === "child" ? "طفل" : "بالغ"} — الميلاد ${t.birthDate} — الجواز ${t.passportNo} (ينتهي ${t.passportExpiry}) — ${t.nationality}${t.relation ? ` — ${t.relation}` : ""}`).join("\n")}\n\nالإيميل: ${data.email}\nالهاتف: ${data.phone}`
        + `${sep}Neue Buchung — Buchungsnummer: ${ref}\n\n${sumDe}\n\nE-Mail: ${data.email}\nTelefon: ${data.phone}`, data.email),
      sendMail(data.email, `Eingangsbestätigung ${ref} — Reisegruppe Ushaq al-Hussein DE`, `${de}${sep}${ar}`),
    ]);
    return { ok: true as const, ref };
  });

export type BookingRow = { id: string; ref: string; created_at: string; trip: string; trip_id?: string | null; trip_date: string | null; contact_email: string; contact_phone: string; room_pref: string | null; notes: string | null; travelers: Array<Record<string, string>>; status: string; payment_status: string; paid_amount: number; total_amount: number; admin_notes: string | null };

export const listBookings = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isStaff(data.password))) return { ok: false as const, rows: [] as BookingRow[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: rows, error }, { data: sc }] = await Promise.all([
      supabaseAdmin.from("bookings").select("*").order("created_at", { ascending: false }).limit(1000),
      supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    const currentTrips = ((sc?.data as { trips?: Array<{ id: string; ar: string; de: string; date?: string; aliases?: string[] }> } | null)?.trips ?? []);
    const dateKey = (s: string | null | undefined) => (s ?? "").replace(/[^0-9]/g, "");
    const nameKey = (s: string | null | undefined) => (s ?? "").toLocaleLowerCase().replace(/[ |—–-]+/g, " ").trim();
    const repairs: Promise<unknown>[] = [];
    const normalized = ((rows ?? []) as unknown as BookingRow[]).map((row) => {
      const byId = row.trip_id ? currentTrips.find((t) => t.id === row.trip_id) : undefined;
      const byDate = currentTrips.filter((t) => dateKey(t.date) && dateKey(t.date) === dateKey(row.trip_date));
      const oldName = nameKey(row.trip);
      const byAlias = currentTrips.find((t) => (t.aliases ?? []).some((a) => {
        const alias = nameKey(a);
        return alias && (oldName === alias || (alias.length > 5 && oldName.includes(alias)) || (oldName.length > 5 && alias.includes(oldName)));
      }));
      const byName = currentTrips.find((t) => {
        const names = [t.ar, t.de, [t.ar, t.de].filter(Boolean).join(" | ")].map(nameKey).filter(Boolean);
        return names.some((n) => oldName === n || (n.length > 5 && oldName.includes(n)) || (oldName.length > 5 && n.includes(oldName)));
      });
      const match = byId ?? byAlias ?? (byDate.length === 1 ? byDate[0] : undefined) ?? byName;
      if (!match) return row;
      const trip = [match.ar, match.de].filter(Boolean).join(" | ");
      const tripDate = match.date ?? row.trip_date;
      if (row.trip_id !== match.id || row.trip !== trip || row.trip_date !== tripDate) {
        repairs.push(supabaseAdmin.from("bookings").update({ trip_id: match.id, trip, trip_date: tripDate }).eq("id", row.id));
      }
      return { ...row, trip_id: match.id, trip, trip_date: tripDate };
    });
    if (repairs.length) await Promise.allSettled(repairs);
    return { ok: true as const, rows: normalized };
  });

export const updateBooking = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    password: z.string().max(200), id: z.string().uuid(),
    status: z.enum(["new", "confirmed", "cancelled", "deleted"]).optional(),
    payment_status: z.enum(["unpaid", "partial", "paid"]).optional(),
    paid_amount: z.number().min(0).max(1_000_000).optional(),
    total_amount: z.number().min(0).max(1_000_000).optional(),
    admin_notes: z.string().max(2000).optional(),
    travelers: z.array(z.record(z.string(), z.string().max(500))).max(30).optional(),
    trip: z.string().trim().min(1).max(200).optional(),
    trip_id: z.string().trim().max(100).nullable().optional(),
    trip_date: z.string().max(100).optional(),
    contact_phone: z.string().max(40).optional(),
    contact_email: z.string().max(255).optional(),
    room_pref: z.string().max(40).optional(),
    notes: z.string().max(2000).optional(),
    remove: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isStaff(data.password))) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _p, id, remove, ...inputPatch } = data;
    const patch: Record<string, unknown> = Object.fromEntries(Object.entries(inputPatch).filter(([, v]) => v !== undefined));
    if (typeof patch["trip_id"] === "string" && patch["trip_id"]) {
      const { data: sc } = await supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle();
      const trips = ((sc?.data as { trips?: Array<{ id: string; ar: string; de: string; date?: string }> } | null)?.trips ?? []);
      const selected = trips.find((t) => t.id === patch["trip_id"]);
      if (selected) {
        patch["trip"] = [selected.ar, selected.de].filter(Boolean).join(" | ");
        patch["trip_date"] = selected.date ?? patch["trip_date"] ?? "";
      }
    }
    const q = remove ? supabaseAdmin.from("bookings").delete().eq("id", id) : supabaseAdmin.from("bookings").update(patch as never).eq("id", id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Staff-only: enter bookings taken before the app (from the leader's notebook). No files or emails required. */
export const addManualBooking = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    password: z.string().max(200),
    trip: z.string().trim().min(1).max(200), trip_id: z.string().trim().max(100).nullable().optional(), trip_date: z.string().max(100),
    contact_phone: z.string().max(40), contact_email: z.string().max(255),
    room_pref: z.string().max(40), notes: z.string().max(2000), admin_notes: z.string().max(2000),
    status: z.enum(["new", "confirmed"]), payment_status: z.enum(["unpaid", "partial", "paid"]),
    paid_amount: z.number().min(0).max(1_000_000), total_amount: z.number().min(0).max(1_000_000),
    travelers: z.array(z.record(z.string(), z.string().max(500))).min(1).max(30),
  }).parse(d))
  .handler(async ({ data }) => {
    if (!(await isStaff(data.password))) return { ok: false as const, ref: "" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sc } = await supabaseAdmin.from("site_content").select("data").eq("id", "main").maybeSingle();
    const currentTrips = ((sc?.data as { trips?: Array<{ id: string; ar: string; de: string; date?: string }> } | null)?.trips ?? []);
    const selectedTrip = data.trip_id ? currentTrips.find((t) => t.id === data.trip_id) : undefined;
    const canonicalTrip = selectedTrip ? [selectedTrip.ar, selectedTrip.de].filter(Boolean).join(" | ") : data.trip;
    const canonicalDate = selectedTrip?.date ?? data.trip_date;
    const canonicalTripId = selectedTrip?.id ?? null;
    const key = (t: Record<string, string>) => { const k = [t["lastName"], t["firstName"], t["birthDate"], t["passportNo"]].map((v) => (v ?? "").trim().toUpperCase()); return k[0] && k[1] && (k[2] || k[3]) ? k.join("|") : ""; };
    const { data: same } = await supabaseAdmin.from("bookings").select("ref, travelers, status").or("trip_id.eq." + canonicalTripId + ",trip.eq." + canonicalTrip);
    const taken = new Set((same ?? []).filter((b) => b.status !== "deleted" && b.status !== "cancelled").flatMap((b) => ((b.travelers ?? []) as Record<string, string>[]).map(key)).filter(Boolean));
    const clash = data.travelers.find((t) => key(t) && taken.has(key(t)));
    if (clash) throw new Error(`مسجّل مسبقاً بنفس البيانات | Bereits gebucht: ${clash["lastName"]} ${clash["firstName"]}`);
    const ref = `UH-${new Date().getFullYear()}-M${Math.floor(100 + Math.random() * 900)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    const { password: _p, trip: _trip, trip_id: _tripId, trip_date: _tripDate, ...row } = data;
    const { error } = await supabaseAdmin.from("bookings").insert({ ...row, trip: canonicalTrip, trip_id: canonicalTripId, trip_date: canonicalDate, ref, travelers: row.travelers as never, admin_notes: `[يدوي | manuell] ${row.admin_notes}`.trim() });
    if (error) throw new Error(error.message);
    return { ok: true as const, ref };
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

/** Reads a passport page (MRZ first) with AI and returns fields for the form; the user always reviews them. */
export const scanPassport = createServerFn({ method: "POST" })
  .validator((d) => z.object({ image: z.string().min(100).max(4_000_000), type: z.enum(["image/jpeg", "image/png", "image/webp"]) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "AI not configured" };
    const props = { firstName: "string", lastName: "string", gender: "string", birthDate: "string", nationality: "string", passportNo: "string", passportExpiry: "string", readable: "boolean" } as const;
    const schema = { type: "object", additionalProperties: false, required: Object.keys(props), properties: Object.fromEntries(Object.entries(props).map(([k, t]) => [k, { type: t }])) };
    const prompt = "Read this passport data page. Use the MRZ (machine readable zone, the two lines of <<< at the bottom) as the primary source and verify against the printed fields. Return: firstName = all given names exactly as in the MRZ (Latin capitals, '<' becomes space), lastName = surname(s) exactly as in the MRZ, gender = 'm' or 'f' or '', birthDate and passportExpiry as YYYY-MM-DD (resolve 2-digit years sensibly: expiry is in the future, birth in the past), nationality = country name in English (e.g. GERMANY, IRAQ), passportNo = document number without spaces or '<'. readable=false and empty strings if this is not a passport or not legible. Never guess.";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra", stream: true, store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "passport", strict: true, schema } },
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: `data:${data.type};base64,${data.image}` }] }],
      }),
    });
    if (!res.ok || !res.body) {
      console.error("scanPassport", res.status, await res.text().catch(() => ""));
      return { ok: false as const, error: res.status === 402 ? "AI credits exhausted" : res.status === 429 ? "Busy, try again shortly" : `AI error ${res.status}` };
    }
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try { const ev = JSON.parse(l.slice(5).trim()) as { type?: string; delta?: string }; if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta; } catch { /* skip */ }
      }
    }
    try {
      const p = JSON.parse(out) as Record<string, string | boolean>;
      if (!p["readable"]) return { ok: false as const, error: "unreadable" };
      const s = (k: string) => String(p[k] ?? "").trim();
      const date = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s(k)) ? s(k) : "");
      return { ok: true as const, fields: {
        firstName: s("firstName").toUpperCase().replace(/[^A-Z '\-]/g, " ").replace(/\s+/g, " ").trim(),
        lastName: s("lastName").toUpperCase().replace(/[^A-Z '\-]/g, " ").replace(/\s+/g, " ").trim(),
        gender: (s("gender") === "m" || s("gender") === "f" ? s("gender") : "") as "m" | "f" | "",
        birthDate: date("birthDate"), passportExpiry: date("passportExpiry"),
        nationality: s("nationality").slice(0, 60), passportNo: s("passportNo").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20),
      } };
    } catch { console.error("scanPassport parse", out.slice(0, 300)); return { ok: false as const, error: "unreadable" }; }
  });
