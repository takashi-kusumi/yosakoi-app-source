import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventPhotos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { getObjectBytes, deleteObject } from "@/lib/storage";
import { redirectWithMessage } from "@/lib/formRedirect";
import { resolveAppUrl } from "@/lib/line";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    const appUrl = resolveAppUrl(request.nextUrl.origin);
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { id: eventId, photoId } = await context.params;
  const [photo] = await db
    .select()
    .from(eventPhotos)
    .where(eq(eventPhotos.id, photoId))
    .limit(1);

  if (!photo || photo.eventId !== eventId) {
    return NextResponse.json({ error: "写真が見つかりません" }, { status: 404 });
  }

  const object = await getObjectBytes(photo.objectKey);
  if (!object) {
    return NextResponse.json({ error: "写真の取得に失敗しました" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(object.buffer), {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType || object.contentType,
      "Content-Length": String(object.buffer.length),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const { id: eventId, photoId } = await context.params;
  const formData = await request.formData();
  const action = formData.get("action");

  if (action !== "delete") {
    return redirectWithMessage(request, `/events/${eventId}`);
  }

  const [photo] = await db
    .select()
    .from(eventPhotos)
    .where(eq(eventPhotos.id, photoId))
    .limit(1);

  if (!photo || photo.eventId !== eventId) {
    return redirectWithMessage(request, `/events/${eventId}`, { error: "写真が見つかりません" });
  }

  const canDelete = member.role === "ADMIN" || photo.uploadedBy === member.id;
  if (!canDelete) {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "この写真を削除する権限がありません",
    });
  }

  await db.delete(eventPhotos).where(eq(eventPhotos.id, photoId));
  try {
    await deleteObject(photo.objectKey);
  } catch (err) {
    console.error("deleteObject failed", err);
  }

  return redirectWithMessage(request, `/events/${eventId}`, { ok: "写真を削除しました" });
}
