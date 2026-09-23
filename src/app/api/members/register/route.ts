import { NextRequest } from "next/server";
import { db } from "@/db";
import { members, memberGroups, memberCategories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { getCurrentTheme } from "@/lib/queries";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { VALID_MEMBER_CATEGORIES } from "@/lib/labels";

export async function POST(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const formData = await request.formData();
  const attribute = String(formData.get("attribute") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const category = String(formData.get("category") || "");
  const groupIds = formData.getAll("groupIds").map((v) => String(v));

  if (!email) {
    return redirectWithMessage(request, "/register", {
      error: "メールアドレスを入力してください",
    });
  }

  // 「部員の種類」は、管理者が /admin/theme で演舞テーマを作成済みのときだけ必須にする。
  // まだテーマが1つも作られていない導入初期は、この項目なしで正部員登録できるようにする。
  const currentTheme = await getCurrentTheme();
  if (
    currentTheme &&
    !VALID_MEMBER_CATEGORIES.includes(category as (typeof VALID_MEMBER_CATEGORIES)[number])
  ) {
    return redirectWithMessage(request, "/register", {
      error: "部員の種類を選択してください",
    });
  }

  await db
    .update(members)
    .set({
      attribute: attribute || null,
      email,
      membershipStatus: "REGULAR",
      updatedAt: new Date(),
    })
    .where(eq(members.id, member.id));

  // 部員の種類は演舞テーマ（管理者が切り替える現在のテーマ）ごとに1件（上書き・新規作成）。
  // 過去のテーマの記録は残る。
  if (currentTheme) {
    const theme = currentTheme.name;
    const [existingCategory] = await db
      .select()
      .from(memberCategories)
      .where(and(eq(memberCategories.memberId, member.id), eq(memberCategories.theme, theme)))
      .limit(1);
    if (existingCategory) {
      await db
        .update(memberCategories)
        .set({
          category: category as (typeof VALID_MEMBER_CATEGORIES)[number],
          updatedAt: new Date(),
        })
        .where(eq(memberCategories.id, existingCategory.id));
    } else {
      await db.insert(memberCategories).values({
        id: newId(),
        memberId: member.id,
        theme,
        category: category as (typeof VALID_MEMBER_CATEGORIES)[number],
      });
    }
  }

  // 所属グループ（パート）を選択内容に合わせて入れ替える
  const currentLinks = await db
    .select()
    .from(memberGroups)
    .where(eq(memberGroups.memberId, member.id));
  const currentGroupIds = new Set(currentLinks.map((l) => l.groupId));
  const nextGroupIds = new Set(groupIds);

  const toRemove = currentLinks.filter((l) => !nextGroupIds.has(l.groupId));
  const toAddGroupIds = groupIds.filter((id) => !currentGroupIds.has(id));

  if (toRemove.length > 0) {
    await db.delete(memberGroups).where(
      and(
        eq(memberGroups.memberId, member.id),
        inArray(
          memberGroups.groupId,
          toRemove.map((l) => l.groupId)
        )
      )
    );
  }
  if (toAddGroupIds.length > 0) {
    await db
      .insert(memberGroups)
      .values(toAddGroupIds.map((groupId) => ({ id: newId(), memberId: member.id, groupId })));
  }

  return redirectWithMessage(request, "/dashboard", {
    ok:
      member.membershipStatus === "REGULAR"
        ? "登録情報を更新しました"
        : "正部員登録が完了しました",
  });
}
