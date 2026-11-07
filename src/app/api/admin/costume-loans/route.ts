import { NextRequest } from "next/server";
import { db } from "@/db";
import { costumes, costumeLoans, costumeLoanPhotos, members } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { jstTodayKey } from "@/lib/calendar";
import { parseDateOnly, pickPhotoFiles, validatePhotoFiles } from "@/lib/costumes";

const NEW_PAGE = "/admin/costumes/loans/new";

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const costumeId = String(formData.get("costumeId") || "");
  const lenderId = String(formData.get("lenderId") || "");
  const borrowerId = String(formData.get("borrowerId") || "");
  const lentOn = parseDateOnly(formData.get("lentOn")) ?? jstTodayKey();
  const dueOnRaw = String(formData.get("dueOn") || "").trim();
  const dueOn = parseDateOnly(dueOnRaw);
  const note = String(formData.get("note") || "").trim();
  const files = pickPhotoFiles(formData);

  if (!costumeId || !lenderId || !borrowerId) {
    return redirectWithMessage(request, NEW_PAGE, { error: "衣装・貸し手・借り手は必須です" });
  }
  if (lenderId === borrowerId) {
    return redirectWithMessage(request, NEW_PAGE, { error: "貸し手と借り手は別のメンバーを選んでください" });
  }
  if (dueOnRaw && !dueOn) {
    return redirectWithMessage(request, NEW_PAGE, { error: "返却予定日の形式が正しくありません" });
  }
  if (dueOn && dueOn < lentOn) {
    return redirectWithMessage(request, NEW_PAGE, { error: "返却予定日は貸した日以降にしてください" });
  }
  const photoError = validatePhotoFiles(files);
  if (photoError) {
    return redirectWithMessage(request, NEW_PAGE, { error: photoError });
  }

  const [costume] = await db.select({ id: costumes.id }).from(costumes).where(eq(costumes.id, costumeId)).limit(1);
  if (!costume) {
    return redirectWithMessage(request, NEW_PAGE, { error: "衣装が見つかりません" });
  }
  const found = await db
    .select({ id: members.id })
    .from(members)
    .where(inArray(members.id, [lenderId, borrowerId]));
  if (found.length !== 2) {
    return redirectWithMessage(request, NEW_PAGE, { error: "貸し手または借り手のメンバーが見つかりません" });
  }

  // 台帳の1件は1着として扱うため、貸出中のものを重ねて貸し出さない（先に返却を記録してもらう）
  const [active] = await db
    .select({ id: costumeLoans.id })
    .from(costumeLoans)
    .where(and(eq(costumeLoans.costumeId, costumeId), isNull(costumeLoans.returnedAt)))
    .limit(1);
  if (active) {
    return redirectWithMessage(request, NEW_PAGE, {
      error: "この衣装は現在貸出中です。先に返却を記録してから、次の貸し出しを登録してください",
    });
  }

  const loanId = newId();
  await db.insert(costumeLoans).values({
    id: loanId,
    costumeId,
    lenderId,
    borrowerId,
    lentOn,
    dueOn,
    note: note || null,
    createdBy: admin.id,
  });

  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    await db.insert(costumeLoanPhotos).values({
      id: newId(),
      loanId,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      dataBase64: buf.toString("base64"),
    });
  }

  return redirectWithMessage(request, "/admin/costumes", { ok: "貸し借りを記録しました" });
}
