import { randomUUID } from "node:crypto";
import { getStaff } from "@/lib/auth";
import { storageBucket } from "@/lib/env";
import { isSameOrigin, jsonError, jsonOk, rateLimit } from "@/lib/security";
import { hasServiceRole } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // stays under common 4.5 MB serverless request limits

/** Identify the real image type from magic bytes — the client-supplied MIME type is never trusted. SVG is deliberately excluded (script risk). */
function sniff(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length >= 6 && (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a")) return { ext: "gif", mime: "image/gif" };
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp" && /avif|avis/.test(buf.subarray(8, 16).toString("ascii"))) return { ext: "avif", mime: "image/avif" };
  return null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Request blocked.");
  const staff = await getStaff();
  if (!staff) return jsonError(401, "Please sign in.");
  if (hasServiceRole() && !(await rateLimit(`upload:${staff.user.id}`, 30, 600))) {
    return jsonError(429, "Too many uploads. Please wait a few minutes.");
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 50_000) return jsonError(413, "Image is too large (max 4 MB).");

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return jsonError(400, "Invalid upload.");
  }
  if (!file || file.size === 0) return jsonError(400, "Choose an image to upload.");
  if (file.size > MAX_BYTES) return jsonError(413, "Image is too large (max 4 MB).");

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniff(buffer);
  if (!type) return jsonError(415, "Only JPEG, PNG, GIF, WebP and AVIF images are allowed.");

  // Random server-generated name: the original filename is never used in the storage path.
  const path = `${staff.user.id}/${new Date().getUTCFullYear()}/${randomUUID()}.${type.ext}`;
  const bucket = storageBucket();
  const { error } = await staff.supabase.storage.from(bucket).upload(path, buffer, { contentType: type.mime, upsert: false, cacheControl: "31536000" });
  if (error) {
    console.error("[upload] storage error:", error.message);
    return jsonError(500, "The image could not be stored. Check the storage bucket configuration.");
  }
  const { data } = staff.supabase.storage.from(bucket).getPublicUrl(path);
  return jsonOk({ url: data.publicUrl });
}
