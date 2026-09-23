import { NextRequest } from "next/server";
import { db } from "@/db";
import { groups } from "@/db/schema";
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
