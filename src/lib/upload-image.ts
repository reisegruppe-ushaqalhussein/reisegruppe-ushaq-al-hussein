import { supabase } from "@/integrations/supabase/client";
import { createUploadUrl, signMediaUrl } from "@/lib/site-content.functions";

/** Resize to max 1280px and re-encode as WebP (~100–200 KB) before upload. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
  return blob ?? file;
}

/** Compress, upload to cloud storage, and return a long-lived display URL. */
export async function uploadImage(file: File, password: string): Promise<string> {
  const blob = await compress(file);
  const { path, token } = await createUploadUrl({ data: { password, name: "img.webp" } });
  const { error } = await supabase.storage.from("resources").uploadToSignedUrl(path, token, blob, { contentType: blob.type || "image/webp" });
  if (error) throw new Error(error.message);
  const { url } = await signMediaUrl({ data: { password, path } });
  return url;
}

/** Normalise a pasted link: add https:// when missing. */
export function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
}
