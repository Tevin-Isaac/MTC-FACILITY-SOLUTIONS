import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const WORK_ORDER_BUCKET = "work-order-files";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
]);

const MAX_BYTES = 12 * 1024 * 1024;

export type UploadKind = "before" | "after" | "document" | "video" | "sign_off";

export function assertUploadFile(file: File) {
  if (file.size <= 0) throw new Error("That file is empty.");
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 12 MB.`);
  const type = file.type || guessType(file.name);
  if (type && !ALLOWED.has(type) && !type.startsWith("image/")) {
    throw new Error(`${file.name} isn't a photo, video, or PDF we can store.`);
  }
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4") return "video/mp4";
  return "";
}

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
}

export async function ensureWorkOrderBucket() {
  const admin = createAdminClient();
  const { data } = await admin.storage.getBucket(WORK_ORDER_BUCKET);
  if (data) return admin;
  const { error } = await admin.storage.createBucket(WORK_ORDER_BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Could not create the file bucket: ${error.message}`);
  }
  return admin;
}

export async function uploadWorkOrderFile(
  workOrderId: string,
  kind: UploadKind,
  file: File
): Promise<{ url: string; path: string; name: string }> {
  assertUploadFile(file);
  const admin = await ensureWorkOrderBucket();
  const path = `${workOrderId}/${kind}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage.from(WORK_ORDER_BUCKET).upload(path, bytes, {
    contentType: file.type || guessType(file.name) || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
  const { data } = admin.storage.from(WORK_ORDER_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, name: file.name };
}

export async function uploadDataUrl(
  workOrderId: string,
  kind: UploadKind,
  dataUrl: string,
  fileName: string
): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("That signature image isn't valid.");
  const contentType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_BYTES) throw new Error("Signature image is too large.");
  const admin = await ensureWorkOrderBucket();
  const path = `${workOrderId}/${kind}/${crypto.randomUUID()}-${safeName(fileName)}`;
  const { error } = await admin.storage.from(WORK_ORDER_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Could not save the signature: ${error.message}`);
  return admin.storage.from(WORK_ORDER_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${WORK_ORDER_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
}

export async function removeWorkOrderFile(url: string) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  const admin = await ensureWorkOrderBucket();
  await admin.storage.from(WORK_ORDER_BUCKET).remove([path]);
}
