import { NextRequest } from "next/server";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { parseQuestionsJson, replaceSurveyQuestions, replaceSurveyTargetGroups } from "@/lib/surveys";
import { parseJstDatetimeLocal } from "@/lib/labels";

export async function POST(request: NextRequest) {
  let member;
  try {
    member = await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const targetMode = String(formData.get("targetMode") || "all");
  const groupIds = formData.getAll("groupIds").map((v) => String(v)).filter(Boolean);
  const questionsJson = String(formData.get("questionsJson") || "[]");
  const closesAt = parseJstDatetimeLocal(String(formData.get("closesAt") || ""));

  if (!title) {
    return redirectWithMessage(request, "/admin/surveys/new", { error: "タイトルは必須です" });
  }
  if (targetMode === "groups" && groupIds.length === 0) {
    return redirectWithMessage(request, "/admin/surveys/new", {
      error: "対象グループを1つ以上選んでください",
    });
  }

  const parsed = parseQuestionsJson(questionsJson);
  if (!parsed.ok) {
    return redirectWithMessage(request, "/admin/surveys/new", { error: parsed.error });
  }

  const surveyId = newId();
  await db.insert(surveys).values({
    id: surveyId,
    title,
    description: description || null,
    createdBy: member.id,
    targetAll: targetMode !== "groups",
    closesAt,
  });

  await replaceSurveyQuestions(surveyId, parsed.questions);
  if (targetMode === "groups") {
    await replaceSurveyTargetGroups(surveyId, groupIds);
  }

  return redirectWithMessage(request, `/admin/surveys/${surveyId}`, {
    ok: "アンケートを作成しました",
  });
}
