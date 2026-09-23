import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventPhotos } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";
import { headObject } from "@/lib/storage";
import { newId } from "@/lib/id";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_SIZE } from "@/lib/eventPhotos";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id: eventId } = await context.params;
  const body = await request.json().catch(() => null);
  const objectKey = typeof body?.objectKey === "string" ? body.objectKey : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName : "photo.jpg";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";

  if (!objectKey.startsWith(`events/${eventId}/`)) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  if (!ALLOWED_PHOTO_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "対応していない画像形式です" }, { status: 400 });
  }

  // アップロードが実際に完了しているかをストレージ側で確認する
  const head = await headObject(objectKey);
  if (!head.exists) {
    return NextResponse.json({ error: "アップロードが完了していません" }, { status: 400 });
  }
  if (head.size > MAX_PHOTO_SIZE) {
    return NextResponse.json({ error: "ファイルサイズが大きすぎます" }, { status: 400 });
  }

  const [row] = await db
    .insert(eventPhotos)
    .values({
      id: newId(),
      eventId,
      uploadedBy: member.id,
      objectKey,
      fileName: fileName.slice(0, 200),
      mimeType,
      fileSize: head.size,
    })
    .returning();

  return NextResponse.json({ ok: true, photo: row });
}
