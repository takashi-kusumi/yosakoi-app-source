import { NextRequest } from "next/server";
import { db } from "@/db";
import { memberTools } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const memberId = String(formData.get("memberId") || "");
  const toolItemId = String(formData.get("toolItemId") || "");
  const owned = formData.get("owned") === "true";
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"), "/admin/tools");

  if (!memberId || !toolItemId) {
    return redirectWithMessage(request, redirectTo, { error: "パラメーターが不正です" });
  }

  const [existing] = await db
    .select()
    .from(memberTools)
    .where(and(eq(memberTools.memberId, memberId), eq(memberTools.toolItemId, toolItemId)))
    .limit(1);

  if (existing) {
    await db
      .update(memberTools)
      .set({ owned, updatedAt: new Date() })
      .where(eq(memberTools.id, existing.id));
  } else {
    await db.insert(memberTools).values({ id: newId(), memberId, toolItemId, owned });
  }

  return redirectWithMessage(request, redirectTo);
}
