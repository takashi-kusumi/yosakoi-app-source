import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { createUploadUrl, isStorageConfigured } from "@/lib/storage";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_SIZE, newPhotoObjectKey } from "@/lib/eventPhotos";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "写真の保存先が設定されていません。管理者に連絡してください。" },
      { status: 503 }
    );
  }

  const { id: eventId } = await context.params;
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const fileSize = typeof body?.fileSize === "number" ? body.fileSize : 0;

  if (!ALLOWED_PHOTO_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "対応していない画像形式です" }, { status: 400 });
  }
  if (!fileSize || fileSize > MAX_PHOTO_SIZE) {
    return NextResponse.json({ error: "ファイルサイズが大きすぎます" }, { status: 400 });
  }

  const ext = mimeType === "image/png" ? "png" : "jpg";
  const objectKey = newPhotoObjectKey(eventId, ext);

  try {
    const uploadUrl = await createUploadUrl(objectKey, mimeType);
    return NextResponse.json({ uploadUrl, objectKey });
  } catch (err) {
    console.error("createUploadUrl failed", err);
    return NextResponse.json({ error: "アップロードURLの発行に失敗しました" }, { status: 500 });
  }
}
