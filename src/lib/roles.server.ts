import { createHash, timingSafeEqual } from "node:crypto";

export type AccessRole = "admin" | "haj";

export function hash(input: string, salt: string) {
  return createHash("sha256").update(salt + input, "utf8").digest("hex");
}

async function storedMatches(key: string, input: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("admin_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return null; // not set
  const [salt, stored] = data.value.split(":");
  if (!salt || !stored) return false;
  const a = Buffer.from(hash(input, salt), "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Identifies which role (general admin or campaign leader) a secret code belongs to. */
export async function verifyRole(input: string): Promise<AccessRole | null> {
  if (!input) return null;
  const admin = await storedMatches("password", input);
  if (admin === true) return "admin";
  if (admin === null) {
    const expected = process.env["ADMIN_PASSWORD"];
    if (expected) {
      const a = createHash("sha256").update(input, "utf8").digest();
      const b = createHash("sha256").update(expected, "utf8").digest();
      if (timingSafeEqual(a, b)) return "admin";
    }
  }
  if ((await storedMatches("haj_password", input)) === true) return "haj";
  return null;
}

