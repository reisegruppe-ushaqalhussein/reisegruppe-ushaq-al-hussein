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

const s = z.string().max(2000);
const contentSchema = z.object({
  trips: z.array(z.object({ id: z.string().max(50), ar: s, de: s, date: s, visible: z.boolean() })).max(30),
  hotels: z.object({ kadhimiya: s, karbala: s, najaf: s }),
  program: z.object({ ar: s, de: s }),
  visa: z.object({ eu: s, nonEu: s }),
  payment: z.object({ visible: z.boolean(), accountName: s, bankName: s, iban: s, bic: s }),
  news: z.array(z.object({ ar: s, de: s, bodyAr: s, bodyDe: s })).max(50),
  duas: z.array(z.object({ id: z.string().max(50), ar: s, de: s, textAr: z.string().max(10000), textDe: z.string().max(10000), link: z.string().max(1000) })).max(50),
  alert: z.object({ ar: s, de: s, active: z.boolean() }),
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .validator((d) => z.object({ password: z.string().max(200), content: contentSchema }).parse(d))
  .handler(async ({ data }) => {
    if (!(await passwordMatches(data.password))) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", data: data.content, updated_at: new Date().toISOString() });
    if (error) throw new Error("Save failed");
    return { ok: true as const };
  });
