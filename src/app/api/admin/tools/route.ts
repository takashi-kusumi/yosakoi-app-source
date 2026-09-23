import { NextRequest } from "next/server";
import { db } from "@/db";
import { toolItems } from "@/db/schema";
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
    const toolItemId = String(formData.get("toolItemId") || "");
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      return redirectWithMessage(request, "/admin/tools", { error: "道具名を入力してください" });
    }
    try {
      await db.update(toolItems).set({ name }).where(eq(toolItems.id, toolItemId));
    } catch {
      return redirectWithMessage(request, "/admin/tools", {
        error: "同じ名前の道具が既に登録されています",
      });
    }
    return redirectWithMessage(request, "/admin/tools", { ok: "道具名を変更しました" });
  }

  if (action === "delete") {
    // 削除すると、全員分の保有状況の記録（member_tools）もカスケード削除される
    const toolItemId = String(formData.get("toolItemId") || "");
    await db.delete(toolItems).where(eq(toolItems.id, toolItemId));
    return redirectWithMessage(request, "/admin/tools", { ok: "道具を削除しました" });
  }

  // action === "create"（フォームに hidden action が無い過去のクライアントとの互換のため、
  // action未指定の場合も新規作成として扱う）
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return redirectWithMessage(request, "/admin/tools", { error: "道具名を入力してください" });
  }

  try {
    await db.insert(toolItems).values({ id: newId(), name });
  } catch {
    return redirectWithMessage(request, "/admin/tools", {
      error: "同じ名前の道具が既に登録されています",
    });
  }

  return redirectWithMessage(request, "/admin/tools", { ok: "道具を追加しました" });
}
