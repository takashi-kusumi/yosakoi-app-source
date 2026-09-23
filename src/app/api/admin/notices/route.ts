import { NextRequest } from "next/server";
import { db } from "@/db";
import { notices, noticeAttachments } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_SIZE,
  MAX_TOTAL_ATTACHMENTS_SIZE,
} from "@/lib/notices";

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim();
  const externalUrl = String(formData.get("externalUrl") || "").trim();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!title) {
    return redirectWithMessage(request, "/admin/notices/new", {
      error: "タイトルは必須です",
    });
  }
  if (externalUrl && !/^https?:\/\//.test(externalUrl)) {
    return redirectWithMessage(request, "/admin/notices/new", {
      error: "外部リンクはhttp(s)://から始まるURLで入力してください",
    });
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_ATTACHMENTS_SIZE) {
    return redirectWithMessage(request, "/admin/notices/new", {
      error: "添付ファイルの合計サイズが大きすぎます（合計4MBまで）",
    });
  }
  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return redirectWithMessage(request, "/admin/notices/new", {
        error: `対応していないファイル形式です: ${file.name}`,
      });
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return redirectWithMessage(request, "/admin/notices/new", {
        error: `ファイルサイズが大きすぎます（1ファイル4MBまで）: ${file.name}`,
      });
    }
  }

  const noticeId = newId();
  await db.insert(notices).values({
    id: noticeId,
    title,
    body: body || null,
    externalUrl: externalUrl || null,
    eventId: eventId || null,
    createdBy: admin.id,
  });

  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    await db.insert(noticeAttachments).values({
      id: newId(),
      noticeId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      dataBase64: buf.toString("base64"),
    });
  }

  return redirectWithMessage(request, "/admin/notices", { ok: "お知らせを作成しました" });
}
