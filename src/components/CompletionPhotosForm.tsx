"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Trash2, Upload, Video, FileText } from "lucide-react";
import { buttonClass, labelClass } from "@/components/ui";

type Slot = "before" | "after" | "video" | "documents";

function FileDrop({
  id,
  label,
  accept,
  multiple,
  files,
  onFiles,
}: {
  id: Slot;
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(list: FileList | null) {
    if (!list?.length) return;
    const next = Array.from(list);
    onFiles(multiple ? [...files, ...next] : next.slice(0, 1));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    take(event.target.files);
    event.target.value = "";
  }

  return (
    <div>
      <p className={labelClass}>{label}</p>
      <label
        htmlFor={`upload-${id}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-card border border-dashed px-3 py-5 text-center transition-colors ${
          over ? "border-navy bg-navy-tint" : "border-hairline bg-sunken"
        }`}
      >
        <ImagePlus className="h-4 w-4 text-ink-3" />
        <span className="text-xs text-ink-2">Drop files or click to choose</span>
        <span className="text-[11px] text-ink-3">Photos, video, or PDF · 12 MB max</span>
        <input
          ref={inputRef}
          id={`upload-${id}`}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={onChange}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 text-xs text-ink-2">
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => onFiles(files.filter((item) => item !== file))}
                className="text-ink-3 hover:text-serious"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PhotoGrid({
  urls,
  side,
  workOrderId,
  pending,
  onRemove,
}: {
  urls: string[];
  side: "before" | "after";
  workOrderId: string;
  pending: boolean;
  onRemove: (url: string, side: "before" | "after" | "video") => void;
}) {
  if (!urls.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {urls.map((url) => (
        <div key={url} className="group relative overflow-hidden rounded-card bg-sunken">
          <a href={url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={side} className="h-28 w-full object-cover" />
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() => onRemove(url, side)}
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-deep/80 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Remove ${side} photo`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function CompletionPhotosForm({
  workOrderId,
  beforeUrls,
  afterUrls,
  videoUrl,
}: {
  workOrderId: string;
  beforeUrls: string[];
  afterUrls: string[];
  videoUrl: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [before, setBefore] = useState<File[]>([]);
  const [after, setAfter] = useState<File[]>([]);
  const [video, setVideo] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);

  const queued = before.length + after.length + video.length + documents.length;

  async function postFiles(form: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/work-order-files", { method: "POST", body: form });
      const result = (await response.json()) as { ok: true; message: string } | { ok: false; error: string };
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return true;
      }
      toast.error(result.error);
      return false;
    } catch {
      toast.error("Could not upload that file. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function upload() {
    if (!queued) return;
    const form = new FormData();
    form.set("workOrderId", workOrderId);
    for (const file of before) form.append("before", file);
    for (const file of after) form.append("after", file);
    for (const file of video) form.append("video", file);
    for (const file of documents) form.append("documents", file);
    const ok = await postFiles(form);
    if (ok) {
      setBefore([]);
      setAfter([]);
      setVideo([]);
      setDocuments([]);
    }
  }

  async function remove(url: string, side: "before" | "after" | "video") {
    const form = new FormData();
    form.set("intent", "remove");
    form.set("workOrderId", workOrderId);
    form.set("url", url);
    form.set("side", side);
    await postFiles(form);
  }

  return (
    <div className="mt-4 space-y-4">
      {(beforeUrls.length > 0 || afterUrls.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className={labelClass}>Before on file</p>
            <PhotoGrid
              urls={beforeUrls}
              side="before"
              workOrderId={workOrderId}
              pending={pending}
              onRemove={remove}
            />
          </div>
          <div>
            <p className={labelClass}>After on file</p>
            <PhotoGrid
              urls={afterUrls}
              side="after"
              workOrderId={workOrderId}
              pending={pending}
              onRemove={remove}
            />
          </div>
        </div>
      )}

      {videoUrl && (
        <div>
          <p className={labelClass}>After video</p>
          <div className="flex items-center justify-between gap-3 rounded-card bg-sunken px-3 py-2">
            <a href={videoUrl} target="_blank" rel="noreferrer" className="truncate text-xs text-navy-ink">
              {videoUrl}
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(videoUrl, "video")}
              className="text-ink-3 hover:text-serious"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FileDrop
          id="before"
          label="Before photos"
          accept="image/*"
          multiple
          files={before}
          onFiles={setBefore}
        />
        <FileDrop
          id="after"
          label="After photos"
          accept="image/*"
          multiple
          files={after}
          onFiles={setAfter}
        />
        <FileDrop
          id="video"
          label="After video"
          accept="video/mp4,video/quicktime"
          files={video}
          onFiles={setVideo}
        />
        <FileDrop
          id="documents"
          label="Documents"
          accept="application/pdf,image/*"
          multiple
          files={documents}
          onFiles={setDocuments}
        />
      </div>

      <button type="button" disabled={pending || queued === 0} onClick={upload} className={buttonClass("primary")}>
        {pending ? (
          "Uploading…"
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {queued === 0 ? "Choose files to upload" : `Upload ${queued} file${queued === 1 ? "" : "s"}`}
          </>
        )}
      </button>
      <p className="flex items-center gap-2 text-[11px] text-ink-3">
        <Video className="h-3.5 w-3.5" />
        <FileText className="h-3.5 w-3.5" />
        Files go to the job packet. Clients see photos on the delivery receipt.
      </p>
    </div>
  );
}
