import { NextRequest } from "next/server";
import { db } from "@/db";
import { memberGroups } from "@/db/schema";
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
  const groupId = String(formData.get("groupId") || "");
  const belongs = formData.get("belongs") === "true";
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"), "/admin/groups");

  if (!memberId || !groupId) {
    return redirectWithMessage(request, redirectTo, { error: "パラメーターが不正です" });
  }

  const [existing] = await db
    .select()
    .from(memberGroups)
    .where(and(eq(memberGroups.memberId, memberId), eq(memberGroups.groupId, groupId)))
    .limit(1);

  if (belongs && !existing) {
    await db.insert(memberGroups).values({ id: newId(), memberId, groupId });
  } else if (!belongs && existing) {
    await db.delete(memberGroups).where(eq(memberGroups.id, existing.id));
  }

  return redirectWithMessage(request, redirectTo);
}
