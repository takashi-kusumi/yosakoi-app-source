import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { noticeAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { resolveAppUrl } from "@/lib/line";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const member = await getCurrentMember();
  if (!member) {
    const appUrl = resolveAppUrl(request.nextUrl.origin);
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const { id } = await context.params;
  const [row] = await db
    .select()
    .from(noticeAttachments)
    .where(eq(noticeAttachments.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });
  }

  const buffer = Buffer.from(row.dataBase64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
