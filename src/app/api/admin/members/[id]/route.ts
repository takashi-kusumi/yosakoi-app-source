import { NextRequest } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await context.params;
  const admin = await (async () => {
    try {
      return await requireAdmin();
    } catch {
      return null;
    }
  })();
  if (!admin) {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "toggleRole") {
    const [target] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (target) {
      const nextRole = target.role === "ADMIN" ? "MEMBER" : "ADMIN";
      if (target.role === "ADMIN" && target.id === admin.id) {
        return redirectWithMessage(request, "/admin/members", {
          error: "自分自身の管理者権限は解除できません",
        });
      }
      await db
        .update(members)
        .set({ role: nextRole, updatedAt: new Date() })
        .where(eq(members.id, memberId));
    }
  } else if (action === "toggleActive") {
    const [target] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (target) {
      if (target.id === admin.id) {
        return redirectWithMessage(request, "/admin/members", {
          error: "自分自身は無効化できません",
        });
      }
      await db
        .update(members)
        .set({ isActive: !target.isActive, updatedAt: new Date() })
        .where(eq(members.id, memberId));
    }
  }

  return redirectWithMessage(request, "/admin/members");
}
