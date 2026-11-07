"use client";

import { useRef, useState } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

// お知らせ添付の画像は、画質より容量を優先して圧縮する
// （添付ファイルはR2ではなくDBにBase64保存されるため、無料枠の消費を抑えるため）。
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.5;

async function compressImageFile(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // 画像として読み込めない場合は圧縮せず元のファイルのまま添付する
    return file;
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

type EventOption = { id: string; title: string };
type ExistingAttachment = { id: string; fileName: string };

export function NoticeForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
  eventOptions,
  existingAttachments,
  deleteAction,
}: {
  action: string;
  submitLabel: string;
  defaultValues?: { title?: string; body?: string; eventId?: string; externalUrl?: string };
  hiddenFields?: { name: string; value: string }[];
  eventOptions: EventOption[];
  existingAttachments?: ExistingAttachment[];
  deleteAction?: string;
}) {
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesChange(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setCompressing(true);
    try {
      const dt = new DataTransfer();
      for (const file of Array.from(fileList)) {
        if (file.type === "image/jpeg" || file.type === "image/png") {
          dt.items.add(await compressImageFile(file));
        } else {
          dt.items.add(file); // PDFなどはそのまま
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
      }
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="space-y-4">
      {existingAttachments && existingAttachments.length > 0 && deleteAction && (
        <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-neutral-600">添付済みファイル</p>
          <ul className="space-y-2">
            {existingAttachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-neutral-600">📎 {a.fileName}</span>
                <form action={deleteAction} method="POST">
                  <input type="hidden" name="action" value="removeAttachment" />
                  <input type="hidden" name="attachmentId" value={a.id} />
                  <ConfirmSubmitButton
                    message="この添付ファイルを削除しますか？"
                    className="shrink-0 text-xs font-semibold text-red-500"
                  >
                    削除
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        action={action}
        method="POST"
        encType="multipart/form-data"
        className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
      >
        {hiddenFields?.map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">タイトル</label>
          <input
            type="text"
            name="title"
            required
            defaultValue={defaultValues?.title ?? ""}
            placeholder="例: 湘南よさこい祭り 集合場所のお知らせ"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">
            関連イベント（任意）
          </label>
          <select
            name="eventId"
            defaultValue={defaultValues?.eventId ?? ""}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="">なし</option>
            {eventOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">本文（任意）</label>
          <textarea
            name="body"
            rows={5}
            defaultValue={defaultValues?.body ?? ""}
            placeholder="集合場所・時間などの連絡事項"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">
            ファイルを添付（任意・複数可）
          </label>
          <input
            ref={fileInputRef}
            type="file"
            name="files"
            multiple
            accept="application/pdf,image/png,image/jpeg"
            disabled={compressing}
            onChange={(e) => handleFilesChange(e.target.files)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
          />
          <p className="mt-1 text-[11px] text-neutral-400">
            PDF・画像（JPEG/PNG）、1回の送信で合計4MBまで。画像は自動的に圧縮してから添付されます（画質は落ちます）。
          </p>
          {compressing && (
            <p className="mt-1 text-[11px] font-semibold text-orange-600">画像を圧縮しています…</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">
            外部リンク（任意）
          </label>
          <input
            type="url"
            name="externalUrl"
            defaultValue={defaultValues?.externalUrl ?? ""}
            placeholder="例: https://drive.google.com/drive/folders/..."
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1 text-[11px] text-neutral-400">
            お祭りの写真をまとめて共有したい場合などは、添付せずにGoogleドライブなどの共有リンクをここに貼ってください（アプリの容量を消費しません）。
          </p>
        </div>

        <button
          type="submit"
          disabled={compressing}
          className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {compressing ? "画像を圧縮中…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
