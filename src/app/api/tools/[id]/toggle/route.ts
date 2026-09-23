import { NextRequest } from "next/server";
import { db } from "@/db";
import { memberTools } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: toolItemId } = await context.params;
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const formData = await request.formData();
  const owned = formData.get("owned") === "true";
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"), "/tools");

  const [existing] = await db
    .select()
    .from(memberTools)
    .where(
      and(eq(memberTools.memberId, member.id), eq(memberTools.toolItemId, toolItemId))
    )
    .limit(1);

  if (existing) {
    await db
      .update(memberTools)
      .set({ owned, updatedAt: new Date() })
      .where(eq(memberTools.id, existing.id));
  } else {
    await db.insert(memberTools).values({
      id: newId(),
      memberId: member.id,
      toolItemId,
      owned,
    });
  }

  return redirectWithMessage(request, redirectTo);
}
