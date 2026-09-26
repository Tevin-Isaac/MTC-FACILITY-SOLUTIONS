"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isId } from "@/lib/ids";
import { parseThread, serializeThread } from "@/lib/thread";
import {
  removeWorkOrderFile,
  uploadDataUrl,
  uploadWorkOrderFile,
  type UploadKind,
} from "@/lib/storage";
type ActionResult =
  | { ok: true; message: string; sharePath?: string }
  | { ok: false; error: string };

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    actor: {
      id: user.id,
      name:
        (profile?.full_name as string | null) ??
        (user.user_metadata?.full_name as string | undefined) ??
        user.email ??
        "Unknown user",
    },
  };
}

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

function tableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    text.includes("does not exist") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    error.code === "PGRST205" ||
    error.code === "42P01"
  );
}

async function logEvent(
  workOrderId: string,
  summary: string,
  actor: { id: string; name: string },
  meta: Record<string, unknown> = {}
) {
  const admin = createAdminClient();
  const { error } = await admin.from("work_order_events").insert({
    work_order_id: workOrderId,
    kind: "attachment_added",
    summary,
    actor_id: actor.id,
    actor_name: actor.name,
    meta,
  });
  if (error && !tableMissing(error)) {
    throw new Error(`Could not record activity: ${error.message}`);
  }
}

async function upsertCompletion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string,
  patch: Record<string, unknown>
) {
  const { data: existing } = await supabase
    .from("completion_records")
    .select("work_order_id")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("completion_records")
      .update(patch)
      .eq("work_order_id", workOrderId);
    if (error) throw new Error(`Could not save files: ${error.message}`);
    return;
  }
  const { error } = await supabase.from("completion_records").insert({
    work_order_id: workOrderId,
    ...patch,
  });
  if (error) throw new Error(`Could not save files: ${error.message}`);
}

function filesFrom(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function uploadCompletionFiles(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    if (!isId(workOrderId)) return { ok: false, error: "Missing work order." };

    const beforeFiles = filesFrom(formData, "before");
    const afterFiles = filesFrom(formData, "after");
    const documentFiles = filesFrom(formData, "documents");
    const videoFiles = filesFrom(formData, "video");
    if (
      beforeFiles.length === 0 &&
      afterFiles.length === 0 &&
      documentFiles.length === 0 &&
      videoFiles.length === 0
    ) {
      return { ok: false, error: "Choose at least one photo, video, or PDF." };
    }

    const { data: existing } = await supabase
      .from("completion_records")
      .select("before_photo_urls, after_photo_urls, after_video_url")
      .eq("work_order_id", workOrderId)
      .maybeSingle();

    const beforeUrls = [...((existing?.before_photo_urls as string[]) ?? [])];
    const afterUrls = [...((existing?.after_photo_urls as string[]) ?? [])];
    let videoUrl = (existing?.after_video_url as string | null) ?? null;

    async function uploadMany(files: File[], kind: UploadKind) {
      const urls: string[] = [];
      for (const file of files) {
        const uploaded = await uploadWorkOrderFile(workOrderId, kind, file);
        urls.push(uploaded.url);
        const { error: attachError } = await supabase.from("work_order_attachments").insert({
          work_order_id: workOrderId,
          kind:
            kind === "before"
              ? "before_photo"
              : kind === "after"
                ? "after_photo"
                : kind === "sign_off"
                  ? "sign_off"
                  : "document",
          storage_path: uploaded.path,
          file_name: uploaded.name,
          content_type: file.type,
          size_bytes: file.size,
          uploaded_by: actor.id,
          uploaded_by_name: actor.name,
        });
        if (attachError && !tableMissing(attachError)) {
          throw new Error(`Could not record the file: ${attachError.message}`);
        }
      }
      return urls;
    }

    beforeUrls.push(...(await uploadMany(beforeFiles, "before")));
    afterUrls.push(...(await uploadMany(afterFiles, "after")));
    const documentUrls = documentFiles.length ? await uploadMany(documentFiles, "document") : [];
    if (videoFiles[0]) {
      const uploaded = await uploadWorkOrderFile(workOrderId, "video", videoFiles[0]);
      videoUrl = uploaded.url;
    }
    if (documentUrls.length) {
      const { data: notesRow } = await supabase
        .from("completion_records")
        .select("technician_notes")
        .eq("work_order_id", workOrderId)
        .maybeSingle();
      const notes = parseThread((notesRow?.technician_notes as string | null) ?? null);
      for (const [index, url] of documentUrls.entries()) {
        notes.unshift({
          id: crypto.randomUUID(),
          body: `Document uploaded: ${documentFiles[index]?.name ?? "file"} — ${url}`,
          visibility: "internal",
          authorName: actor.name,
          createdAt: new Date().toISOString(),
          channel: "note",
          audience: "internal",
          contactName: null,
          contactValue: null,
          outcome: null,
        });
      }
      await upsertCompletion(supabase, workOrderId, { technician_notes: serializeThread(notes) });
    }

    await upsertCompletion(supabase, workOrderId, {
      before_photo_urls: beforeUrls,
      after_photo_urls: afterUrls,
      after_video_url: videoUrl,
    });

    const count = beforeFiles.length + afterFiles.length + documentFiles.length + videoFiles.length;
    await logEvent(workOrderId, `${count} file${count === 1 ? "" : "s"} uploaded`, actor, {
      before: beforeFiles.length,
      after: afterFiles.length,
      documents: documentFiles.length,
      video: videoFiles.length,
    });
    revalidatePath(`/work-orders/${workOrderId}`);
    return { ok: true, message: count === 1 ? "File uploaded." : `${count} files uploaded.` };
  });
}

export async function removeCompletionFile(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    const url = String(formData.get("url") ?? "");
    const side = formData.get("side") === "after" ? "after" : formData.get("side") === "video" ? "video" : "before";
    if (!isId(workOrderId) || !url) return { ok: false, error: "Missing file." };

    const { data: existing } = await supabase
      .from("completion_records")
      .select("before_photo_urls, after_photo_urls, after_video_url")
      .eq("work_order_id", workOrderId)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Nothing to remove." };

    await removeWorkOrderFile(url);
    const patch =
      side === "video"
        ? { after_video_url: existing.after_video_url === url ? null : existing.after_video_url }
        : side === "after"
          ? {
              after_photo_urls: ((existing.after_photo_urls as string[]) ?? []).filter((item) => item !== url),
            }
          : {
              before_photo_urls: ((existing.before_photo_urls as string[]) ?? []).filter((item) => item !== url),
            };
    await upsertCompletion(supabase, workOrderId, patch);
    await logEvent(workOrderId, "File removed from the completion packet", actor, { url, side });
    revalidatePath(`/work-orders/${workOrderId}`);
    return { ok: true, message: "File removed." };
  });
}

export async function saveRootCause(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    const rootCause = String(formData.get("rootCause") ?? "").trim();
    if (!isId(workOrderId)) return { ok: false, error: "Missing work order." };
    if (rootCause.length < 3) return { ok: false, error: "Write the root cause in a sentence." };
    await upsertCompletion(supabase, workOrderId, { root_cause: rootCause });
    revalidatePath(`/work-orders/${workOrderId}`);
    return { ok: true, message: "Root cause saved." };
  });
}

export async function saveSignOffSignature(
  workOrderId: string,
  dataUrl: string
): Promise<string | null> {
  if (!dataUrl.startsWith("data:image/")) return null;
  return uploadDataUrl(workOrderId, "sign_off", dataUrl, "sign-off.png");
}
