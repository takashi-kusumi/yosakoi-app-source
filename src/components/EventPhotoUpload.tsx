"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const MAX_FILES_PER_BATCH = 20;
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;

async function resizeToJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name}: この形式の画像は読み込めません（HEIC等の場合はJPEG/PNGに変換してください）`);
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(`${file.name}: 画像の処理に失敗しました`);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`${file.name}: 画像の変換に失敗しました`))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export function EventPhotoUpload({ eventId }: { eventId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES_PER_BATCH);

    setUploading(true);
    setError("");
    setProgress({ done: 0, total: files.length });

    for (const [i, file] of files.entries()) {
      try {
        const blob = await resizeToJpeg(file);
        if (blob.size > MAX_UPLOAD_SIZE) {
          throw new Error(`${file.name}: サイズが大きすぎます`);
        }

        const presignRes = await fetch(`/api/events/${eventId}/photos/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mimeType: "image/jpeg", fileSize: blob.size }),
        });
        if (!presignRes.ok) {
          const body = await presignRes.json().catch(() => null);
          throw new Error(body?.error ?? "アップロードURLの取得に失敗しました");
        }
        const { uploadUrl, objectKey } = await presignRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!putRes.ok) {
          throw new Error(`${file.name}: アップロードに失敗しました`);
        }

        const completeRes = await fetch(`/api/events/${eventId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey, fileName: file.name, mimeType: "image/jpeg" }),
        });
        if (!completeRes.ok) {
          const body = await completeRes.json().catch(() => null);
          throw new Error(body?.error ?? `${file.name}: 登録に失敗しました`);
        }
      } catch (e) {
        setUploading(false);
        setProgress(null);
        setError(e instanceof Error ? e.message : "アップロードに失敗しました");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setProgress({ done: i + 1, total: files.length });
    }

    if (inputRef.current) inputRef.current.value = "";
    window.location.reload();
  }

  return (
    <div className="space-y-2">
      <label
        className={`block w-full cursor-pointer rounded-lg border border-dashed px-3 py-3 text-center text-sm font-semibold ${
          uploading
            ? "border-neutral-300 bg-neutral-100 text-neutral-400"
            : "border-orange-300 bg-orange-50 text-orange-700"
        }`}
      >
        {uploading ? `アップロード中… (${progress?.done ?? 0}/${progress?.total ?? 0})` : "＋ 写真を追加"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-[11px] text-neutral-400">
        写真（JPEG/PNG）、1回に最大{MAX_FILES_PER_BATCH}枚まで。自動的に縮小してアップロードします。
      </p>
    </div>
  );
}
