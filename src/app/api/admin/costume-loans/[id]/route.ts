import { NextRequest } from "next/server";
import { db } from "@/db";
import { costumeLoans, costumeLoanPhotos, members } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { parseDateOnly, pickPhotoFiles, validatePhotoFiles } from "@/lib/costumes";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const { id } = await context.params;
  const detailPath = `/admin/costumes/loans/${id}`;
  const formData = await request.formData();
  const action = formData.get("action");

  const [loan] = await db.select().from(costumeLoans).where(eq(costumeLoans.id, id)).limit(1);
  if (!loan) {
    return redirectWithMessage(request, "/admin/costumes", { error: "貸し借りの記録が見つかりません" });
  }

  if (action === "return") {
    // 一覧からも詳細からも押せるよう、戻り先を指定可能にする（サイト内パスのみ）
    const redirectTo = safeRedirectTarget(formData.get("redirectTo"), detailPath);
    await db
      .update(costumeLoans)
      .set({ returnedAt: new Date(), updatedAt: new Date() })
      .where(eq(costumeLoans.id, id));
    return redirectWithMessage(request, redirectTo, { ok: "返却済みにしました" });
  }

  if (action === "reopen") {
    // 誤って返却済みにした場合に貸出中へ戻す。他の人に貸し出し済みの場合は戻せない。
    const others = await db
      .select({ id: costumeLoans.id, returnedAt: costumeLoans.returnedAt })
      .from(costumeLoans)
      .where(eq(costumeLoans.costumeId, loan.costumeId));
    if (others.some((o) => o.id !== id && !o.returnedAt)) {
      return redirectWithMessage(request, detailPath, {
        error: "この衣装は別の人に貸出中のため、貸出中に戻せません",
      });
    }
    await db
      .update(costumeLoans)
      .set({ returnedAt: null, updatedAt: new Date() })
      .where(eq(costumeLoans.id, id));
    return redirectWithMessage(request, detailPath, { ok: "貸出中に戻しました" });
  }

  if (action === "update") {
    const lenderId = String(formData.get("lenderId") || "");
    const borrowerId = String(formData.get("borrowerId") || "");
    const lentOn = parseDateOnly(formData.get("lentOn"));
    const dueOnRaw = String(formData.get("dueOn") || "").trim();
    const dueOn = parseDateOnly(dueOnRaw);
    const note = String(formData.get("note") || "").trim();

    if (!lenderId || !borrowerId || !lentOn) {
      return redirectWithMessage(request, detailPath, { error: "貸し手・借り手・貸した日は必須です" });
    }
    if (lenderId === borrowerId) {
      return redirectWithMessage(request, detailPath, { error: "貸し手と借り手は別のメンバーを選んでください" });
    }
    if (dueOnRaw && !dueOn) {
      return redirectWithMessage(request, detailPath, { error: "返却予定日の形式が正しくありません" });
    }
    if (dueOn && dueOn < lentOn) {
      return redirectWithMessage(request, detailPath, { error: "返却予定日は貸した日以降にしてください" });
    }
    const found = await db
      .select({ id: members.id })
      .from(members)
      .where(inArray(members.id, [lenderId, borrowerId]));
    if (found.length !== 2) {
      return redirectWithMessage(request, detailPath, { error: "貸し手または借り手のメンバーが見つかりません" });
    }

    await db
      .update(costumeLoans)
      .set({ lenderId, borrowerId, lentOn, dueOn, note: note || null, updatedAt: new Date() })
      .where(eq(costumeLoans.id, id));
    return redirectWithMessage(request, detailPath, { ok: "記録を更新しました" });
  }

  if (action === "addPhotos") {
    const files = pickPhotoFiles(formData);
    if (files.length === 0) {
      return redirectWithMessage(request, detailPath, { error: "写真を選択してください" });
    }
    const photoError = validatePhotoFiles(files);
    if (photoError) {
      return redirectWithMessage(request, detailPath, { error: photoError });
    }
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      await db.insert(costumeLoanPhotos).values({
        id: newId(),
        loanId: id,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        dataBase64: buf.toString("base64"),
      });
    }
    return redirectWithMessage(request, detailPath, { ok: `${files.length}枚の写真を追加しました` });
  }

  if (action === "deletePhoto") {
    const photoId = String(formData.get("photoId") || "");
    // 他の記録の写真を消してしまわないよう、この貸し借りに紐づく写真に限定する
    await db
      .delete(costumeLoanPhotos)
      .where(and(eq(costumeLoanPhotos.id, photoId), eq(costumeLoanPhotos.loanId, id)));
    return redirectWithMessage(request, detailPath, { ok: "写真を削除しました" });
  }

  if (action === "delete") {
    // 写真もカスケード削除される
    await db.delete(costumeLoans).where(eq(costumeLoans.id, id));
    return redirectWithMessage(request, "/admin/costumes", { ok: "貸し借りの記録を削除しました" });
  }

  return redirectWithMessage(request, detailPath, { error: "操作が不正です" });
}
