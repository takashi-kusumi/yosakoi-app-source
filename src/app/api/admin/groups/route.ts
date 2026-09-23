import { NextRequest } from "next/server";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "rename") {
    const groupId = String(formData.get("groupId") || "");
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      return redirectWithMessage(request, "/admin/groups", { error: "グループ名を入力してください" });
    }
    try {
      await db.update(groups).set({ name }).where(eq(groups.id, groupId));
    } catch {
      return redirectWithMessage(request, "/admin/groups", {
        error: "同じ名前のグループが既に登録されています",
      });
    }
    return redirectWithMessage(request, "/admin/groups", { ok: "グループ名を変更しました" });
  }

  if (action === "delete") {
    // 削除すると、メンバーの所属記録（member_groups）・アンケートの対象グループ設定
    // （survey_target_groups）もカスケード削除される
    const groupId = String(formData.get("groupId") || "");
    await db.delete(groups).where(eq(groups.id, groupId));
    return redirectWithMessage(request, "/admin/groups", { ok: "グループを削除しました" });
  }

  // action === "create"
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return redirectWithMessage(request, "/admin/groups", { error: "グループ名を入力してください" });
  }

  try {
    await db.insert(groups).values({ id: newId(), name });
  } catch {
    return redirectWithMessage(request, "/admin/groups", {
      error: "同じ名前のグループが既に登録されています",
    });
  }

  return redirectWithMessage(request, "/admin/groups", { ok: "グループを追加しました" });
}
