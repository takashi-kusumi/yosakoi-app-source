import { NextRequest } from "next/server";
import { db } from "@/db";
import { members, membershipFees, memberCategories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { VALID_MEMBER_CATEGORIES } from "@/lib/labels";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const theme = String(formData.get("theme") || "").trim();

  if (!theme) {
    return redirectWithMessage(request, "/admin/fees", { error: "演舞テーマが不正です" });
  }

  if (action === "upsert") {
    const memberId = String(formData.get("memberId") || "");
    const amountRaw = String(formData.get("amount") || "");
    const paid = formData.get("paid") === "true";

    if (!memberId || amountRaw === "") {
      return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
        error: "金額を入力してください",
      });
    }
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
        error: "金額が不正です",
      });
    }

    const [existing] = await db
      .select()
      .from(membershipFees)
      .where(and(eq(membershipFees.memberId, memberId), eq(membershipFees.theme, theme)))
      .limit(1);

    if (existing) {
      await db
        .update(membershipFees)
        .set({
          amount,
          paid,
          paidAt: paid ? (existing.paid ? existing.paidAt : new Date()) : null,
          updatedAt: new Date(),
        })
        .where(eq(membershipFees.id, existing.id));
    } else {
      await db.insert(membershipFees).values({
        id: newId(),
        memberId,
        theme,
        amount,
        paid,
        paidAt: paid ? new Date() : null,
      });
    }

    return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
      ok: "年会費の状況を更新しました",
    });
  }

  if (action === "bulkCreateByCategory") {
    // 部員の種類（演者/サポートなど）ごとに金額を指定して、その属性のメンバーに
    // まとめて未払いレコードを作成する。既にレコードがある人はスキップする
    // （個別の金額調整・支払済みを上書きしないため）。
    const categoryFilter = String(formData.get("category") || "");
    const isUnset = categoryFilter === "UNSET";
    if (
      !isUnset &&
      !VALID_MEMBER_CATEGORIES.includes(categoryFilter as (typeof VALID_MEMBER_CATEGORIES)[number])
    ) {
      return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
        error: "属性が不正です",
      });
    }
    const amountRaw = String(formData.get("amount") || "");
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
        error: "金額が不正です",
      });
    }

    const regularMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(
        and(
          eq(members.membershipStatus, "REGULAR"),
          eq(members.isActive, true),
          eq(members.isGuest, false)
        )
      );

    const categoryRows = await db
      .select()
      .from(memberCategories)
      .where(eq(memberCategories.theme, theme));
    const categoryByMember = new Map(categoryRows.map((r) => [r.memberId, r.category]));

    const matchingMembers = regularMembers.filter((m) => {
      const category = categoryByMember.get(m.id);
      return isUnset ? !category : category === categoryFilter;
    });

    const existingFees = await db
      .select({ memberId: membershipFees.memberId })
      .from(membershipFees)
      .where(eq(membershipFees.theme, theme));
    const existingMemberIds = new Set(existingFees.map((f) => f.memberId));

    const toCreate = matchingMembers.filter((m) => !existingMemberIds.has(m.id));
    if (toCreate.length > 0) {
      await db.insert(membershipFees).values(
        toCreate.map((m) => ({
          id: newId(),
          memberId: m.id,
          theme,
          amount,
          paid: false,
        }))
      );
    }

    return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
      ok: `${toCreate.length}件のレコードを作成しました`,
    });
  }

  return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
    error: "操作が不正です",
  });
}
