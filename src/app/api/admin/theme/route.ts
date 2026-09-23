import { NextRequest } from "next/server";
import { db } from "@/db";
import { performanceThemes, memberCategories, membershipFees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { getCurrentTheme, getMemberLatestCategory, getPendingCategoryMembers } from "@/lib/queries";

/**
 * 演舞テーマ（performanceThemes）の管理。年会費・部員の種類は、ここで管理者が切り替える
 * 「現在のテーマ」名に紐づく（membershipFees.theme / memberCategories.themeに同じ文字列を
 * 使う。FK制約は張っていない＝緩い結合）。
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "switch") {
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      return redirectWithMessage(request, "/admin/theme", { error: "テーマ名を入力してください" });
    }

    try {
      await db.insert(performanceThemes).values({ id: newId(), name, isCurrent: false });
    } catch {
      return redirectWithMessage(request, "/admin/theme", {
        error: "同じ名前のテーマが既に存在します",
      });
    }

    // 「現在のテーマ」は常に1件だけにする。先に全部falseにしてから、今回作った分だけtrueにする。
    await db
      .update(performanceThemes)
      .set({ isCurrent: false })
      .where(eq(performanceThemes.isCurrent, true));
    await db
      .update(performanceThemes)
      .set({ isCurrent: true })
      .where(eq(performanceThemes.name, name));

    return redirectWithMessage(request, "/admin/theme", {
      ok: `「${name}」に切り替えました`,
    });
  }

  if (action === "carryForward") {
    const memberId = String(formData.get("memberId") || "");
    const currentTheme = await getCurrentTheme();
    if (!currentTheme) {
      return redirectWithMessage(request, "/admin/theme", { error: "現在のテーマが未設定です" });
    }
    const previousCategory = await getMemberLatestCategory(memberId, currentTheme.name);
    if (!previousCategory) {
      return redirectWithMessage(request, "/admin/theme", {
        error: "引き継ぎ元となる過去の記録が見つかりません",
      });
    }

    const [existing] = await db
      .select()
      .from(memberCategories)
      .where(
        and(eq(memberCategories.memberId, memberId), eq(memberCategories.theme, currentTheme.name))
      )
      .limit(1);
    if (existing) {
      await db
        .update(memberCategories)
        .set({ category: previousCategory, updatedAt: new Date() })
        .where(eq(memberCategories.id, existing.id));
    } else {
      await db.insert(memberCategories).values({
        id: newId(),
        memberId,
        theme: currentTheme.name,
        category: previousCategory,
      });
    }

    return redirectWithMessage(request, "/admin/theme", { ok: "前回の内容を引き継ぎました" });
  }

  if (action === "bulkCarryForward") {
    const currentTheme = await getCurrentTheme();
    if (!currentTheme) {
      return redirectWithMessage(request, "/admin/theme", { error: "現在のテーマが未設定です" });
    }
    const pending = await getPendingCategoryMembers(currentTheme.name);
    const toCarry = pending.filter((p) => p.previousCategory);

    for (const p of toCarry) {
      await db.insert(memberCategories).values({
        id: newId(),
        memberId: p.member.id,
        theme: currentTheme.name,
        category: p.previousCategory!,
      });
    }

    return redirectWithMessage(request, "/admin/theme", {
      ok: `${toCarry.length}名分を前回の内容で引き継ぎました`,
    });
  }

  if (action === "rename") {
    // テーマ名は文字列で年会費（membershipFees.theme）・部員の種類（memberCategories.theme）に
    // ゆるく紐づいているため、リネーム時はそちらも追従させて記録が迷子にならないようにする。
    const themeId = String(formData.get("themeId") || "");
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      return redirectWithMessage(request, "/admin/theme", { error: "テーマ名を入力してください" });
    }
    const [existing] = await db
      .select()
      .from(performanceThemes)
      .where(eq(performanceThemes.id, themeId))
      .limit(1);
    if (!existing) {
      return redirectWithMessage(request, "/admin/theme", { error: "対象のテーマが見つかりません" });
    }
    const oldName = existing.name;
    if (oldName === name) {
      return redirectWithMessage(request, "/admin/theme", { ok: "変更はありませんでした" });
    }

    try {
      await db.update(performanceThemes).set({ name }).where(eq(performanceThemes.id, themeId));
    } catch {
      return redirectWithMessage(request, "/admin/theme", {
        error: "同じ名前のテーマが既に存在します",
      });
    }
    await db.update(membershipFees).set({ theme: name }).where(eq(membershipFees.theme, oldName));
    await db
      .update(memberCategories)
      .set({ theme: name })
      .where(eq(memberCategories.theme, oldName));

    return redirectWithMessage(request, "/admin/theme", {
      ok: `「${oldName}」を「${name}」に変更しました`,
    });
  }

  if (action === "delete") {
    // 現在のテーマは削除させない（切り替えてから削除してもらう）。年会費・部員の種類は
    // テーマ名の文字列でゆるく紐づいているだけなので、ここでこの行を消しても
    // 既存の記録（membershipFees / memberCategories）は残る。
    const themeId = String(formData.get("themeId") || "");
    const [existing] = await db
      .select()
      .from(performanceThemes)
      .where(eq(performanceThemes.id, themeId))
      .limit(1);
    if (!existing) {
      return redirectWithMessage(request, "/admin/theme", { error: "対象のテーマが見つかりません" });
    }
    if (existing.isCurrent) {
      return redirectWithMessage(request, "/admin/theme", {
        error: "現在のテーマは削除できません。先に別のテーマへ切り替えてください",
      });
    }
    await db.delete(performanceThemes).where(eq(performanceThemes.id, themeId));
    return redirectWithMessage(request, "/admin/theme", { ok: `「${existing.name}」を削除しました` });
  }

  if (action === "dismiss") {
    // 「選び直してもらう」= 何もしない。本人が/registerで選ぶまで一覧に残り続ける想定。
    const displayName = String(formData.get("displayName") || "");
    return redirectWithMessage(request, "/admin/theme", {
      ok: `${displayName}さんは選び直してもらう対応にしました（本人が登録するまで一覧に表示され続けます）`,
    });
  }

  return redirectWithMessage(request, "/admin/theme", { error: "操作が不正です" });
}
