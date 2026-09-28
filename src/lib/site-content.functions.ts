import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mergeContent, type SiteContent } from "./site-content";

function passwordMatches(input: string) {
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
  .inputValidator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => ({ ok: passwordMatches(data.password) }));

const s = z.string().max(2000);
const contentSchema = z.object({
  trips: z.array(z.object({ id: z.string().max(50), ar: s, de: s, date: s, visible: z.boolean() })).max(30),
  hotels: z.object({ kadhimiya: s, karbala: s, najaf: s }),
  program: z.object({ ar: s, de: s }),
  visa: z.object({ eu: s, nonEu: s }),
  news: z.array(z.object({ ar: s, de: s, bodyAr: s, bodyDe: s })).max(50),
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200), content: contentSchema }).parse(d))
  .handler(async ({ data }) => {
    if (!passwordMatches(data.password)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ id: "main", data: data.content, updated_at: new Date().toISOString() });
    if (error) throw new Error("Save failed");
    return { ok: true as const };
  });
