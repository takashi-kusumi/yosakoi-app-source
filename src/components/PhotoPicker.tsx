"use client";

import { useRef, useState } from "react";

// 写真は画質より容量を優先して圧縮する（DBにBase64保存されるため、DB容量の消費を抑える）。
// スマホで撮った写真は数MBになりやすく、送信サイズの上限（4MB）に引っかかるのを防ぐ目的もある。
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.6;

async function compressImageFile(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // 画像として読み込めない場合は圧縮せずそのまま
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^./]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

/** 写真を複数選べる入力欄。選択した画像は送信前に自動で圧縮する（フィールド名は "photos"） */
export function PhotoPicker({ className }: { className?: string }) {
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setCompressing(true);
    try {
      const dt = new DataTransfer();
      for (const file of Array.from(fileList)) {
        dt.items.add(await compressImageFile(file));
      }
      if (inputRef.current) inputRef.current.files = dt.files;
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        name="photos"
        multiple
        accept="image/png,image/jpeg"
        disabled={compressing}
        onChange={(e) => handleChange(e.target.files)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
      />
      <p className="mt-1 text-[11px] text-neutral-400">
        {compressing
          ? "写真を圧縮しています…"
          : "PNG / JPEG。送信前に自動で圧縮されます（1回の送信で合計4MBまで）"}
      </p>
    </div>
  );
}
