import { NextRequest } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { redirectWithMessage } from "@/lib/formRedirect";

/**
 * 部員が行動規範に同意したことを記録する。
 * codeOfConductAgreedAtがnullのまま残っている場合、(app)レイアウトが/consentへリダイレクトし続ける。
 */
export async function POST(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const formData = await request.formData();
  const agree = formData.get("agree");
  if (!agree) {
    return redirectWithMessage(request, "/consent", {
      error: "行動規範に同意する場合はチェックを入れてください",
    });
  }

  await db
    .update(members)
    .set({ codeOfConductAgreedAt: new Date(), updatedAt: new Date() })
    .where(eq(members.id, member.id));

  return redirectWithMessage(request, "/dashboard", {
    ok: "行動規範への同意ありがとうございました",
  });
}
