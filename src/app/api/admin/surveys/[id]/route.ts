import { NextRequest } from "next/server";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { redirectWithMessage } from "@/lib/formRedirect";
import {
  haveQuestionsChanged,
  parseQuestionsJson,
  replaceSurveyQuestions,
  replaceSurveyTargetGroups,
} from "@/lib/surveys";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: surveyId } = await context.params;
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "close") {
    await db.update(surveys).set({ isOpen: false, updatedAt: new Date() }).where(eq(surveys.id, surveyId));
    return redirectWithMessage(request, `/admin/surveys/${surveyId}`, { ok: "回答受付を締め切りました" });
  }

  if (action === "reopen") {
    await db.update(surveys).set({ isOpen: true, updatedAt: new Date() }).where(eq(surveys.id, surveyId));
    return redirectWithMessage(request, `/admin/surveys/${surveyId}`, { ok: "回答受付を再開しました" });
  }

  if (action === "delete") {
    await db.delete(surveys).where(eq(surveys.id, surveyId));
    return redirectWithMessage(request, "/admin/surveys", { ok: "アンケートを削除しました" });
  }

  // action === "update"
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const targetMode = String(formData.get("targetMode") || "all");
  const groupIds = formData.getAll("groupIds").map((v) => String(v)).filter(Boolean);
  const questionsJson = String(formData.get("questionsJson") || "[]");

  if (!title) {
    return redirectWithMessage(request, `/admin/surveys/${surveyId}/edit`, { error: "タイトルは必須です" });
  }
  if (targetMode === "groups" && groupIds.length === 0) {
    return redirectWithMessage(request, `/admin/surveys/${surveyId}/edit`, {
      error: "対象グループを1つ以上選んでください",
    });
  }

  const parsed = parseQuestionsJson(questionsJson);
  if (!parsed.ok) {
    return redirectWithMessage(request, `/admin/surveys/${surveyId}/edit`, { error: parsed.error });
  }

  await db
    .update(surveys)
    .set({
      title,
      description: description || null,
      targetAll: targetMode !== "groups",
      updatedAt: new Date(),
    })
    .where(eq(surveys.id, surveyId));

  // 質問の内容（種類・文言・必須・選択肢）を実際に変更した場合のみ、質問一式を置き換える。
  // タイトル・説明・対象者だけの変更では既存回答を消さない（ドキュメント上の仕様どおり）。
  const questionsChanged = await haveQuestionsChanged(surveyId, parsed.questions);
  if (questionsChanged) {
    await replaceSurveyQuestions(surveyId, parsed.questions);
  }
  await replaceSurveyTargetGroups(surveyId, targetMode === "groups" ? groupIds : []);

  return redirectWithMessage(request, `/admin/surveys/${surveyId}`, {
    ok: questionsChanged
      ? "更新しました（質問内容が変更されたため、既存の回答は削除されました）"
      : "更新しました",
  });
}
