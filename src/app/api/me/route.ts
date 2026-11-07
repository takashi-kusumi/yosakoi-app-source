import { NextRequest } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { redirectWithMessage } from "@/lib/formRedirect";
import { normalizeFullName } from "@/lib/profile";

/** 本人のプロフィール操作（初回のWelcome完了・名前の変更） */
export async function POST(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }
  const formData = await request.formData();
  const action = formData.get("action");
  const fullName = normalizeFullName(formData.get("fullName"));

  if (action === "completeOnboarding") {
    if (!fullName) {
      return redirectWithMessage(request, "/welcome", { error: "フルネームを2〜30文字で入力してください" });
    }
    await db
      .update(members)
      .set({ displayName: fullName, onboardedAt: new Date(), updatedAt: new Date() })
      .where(eq(members.id, member.id));
    return redirectWithMessage(request, "/dashboard", { ok: `${fullName}さん、ようこそ！` });
  }

  if (action === "updateName") {
    if (!fullName) {
      return redirectWithMessage(request, "/me", { error: "フルネームを2〜30文字で入力してください" });
    }
    await db
      .update(members)
      .set({ displayName: fullName, updatedAt: new Date() })
      .where(eq(members.id, member.id));
    return redirectWithMessage(request, "/me", { ok: "名前を変更しました" });
  }

  return redirectWithMessage(request, "/me", { error: "操作が不正です" });
}
