import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { costumeLoanPhotos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

// 貸し借りの写真は管理者のみ閲覧できる（メンバー向けの画面は現状ない）
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "管理者のみ閲覧できます" }, { status: 403 });
  }

  const { id } = await context.params;
  const [row] = await db
    .select()
    .from(costumeLoanPhotos)
    .where(eq(costumeLoanPhotos.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "写真が見つかりません" }, { status: 404 });
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
