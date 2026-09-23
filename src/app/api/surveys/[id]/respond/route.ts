import { NextRequest } from "next/server";
import { db } from "@/db";
import { surveyResponses, surveyAnswers, surveyAnswerOptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { getSurveyWithQuestions, getSurveyTargetMembers } from "@/lib/queries";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: surveyId } = await context.params;
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const detail = await getSurveyWithQuestions(surveyId);
  if (!detail) {
    return redirectWithMessage(request, "/surveys", { error: "アンケートが見つかりません" });
  }
  if (!detail.survey.isOpen) {
    return redirectWithMessage(request, `/surveys/${surveyId}`, {
      error: "このアンケートは回答受付を終了しています",
    });
  }

  const targetMembers = await getSurveyTargetMembers(surveyId);
  if (!targetMembers.some((m) => m.id === member.id)) {
    return redirectWithMessage(request, "/surveys", { error: "このアンケートの対象者ではありません" });
  }

  const formData = await request.formData();

  const answersToInsert: { questionId: string; textAnswer: string | null; optionIds: string[] }[] = [];

  for (const q of detail.questions) {
    const fieldName = `q_${q.id}`;
    if (q.type === "TEXT") {
      const value = String(formData.get(fieldName) || "").trim();
      if (q.required && !value) {
        return redirectWithMessage(request, `/surveys/${surveyId}`, {
          error: `「${q.questionText}」は必須です`,
        });
      }
      answersToInsert.push({ questionId: q.id, textAnswer: value || null, optionIds: [] });
    } else if (q.type === "SINGLE") {
      const value = String(formData.get(fieldName) || "").trim();
      if (q.required && !value) {
        return redirectWithMessage(request, `/surveys/${surveyId}`, {
          error: `「${q.questionText}」は必須です`,
        });
      }
      answersToInsert.push({
        questionId: q.id,
        textAnswer: null,
        optionIds: value ? [value] : [],
      });
    } else {
      const values = formData.getAll(fieldName).map((v) => String(v)).filter(Boolean);
      if (q.required && values.length === 0) {
        return redirectWithMessage(request, `/surveys/${surveyId}`, {
          error: `「${q.questionText}」は必須です`,
        });
      }
      answersToInsert.push({ questionId: q.id, textAnswer: null, optionIds: values });
    }
  }

  // 既存の回答があれば作り直す(再回答を許可)
  const [existing] = await db
    .select()
    .from(surveyResponses)
    .where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.memberId, member.id)))
    .limit(1);
  if (existing) {
    await db.delete(surveyResponses).where(eq(surveyResponses.id, existing.id));
  }

  const responseId = newId();
  await db.insert(surveyResponses).values({ id: responseId, surveyId, memberId: member.id });

  for (const a of answersToInsert) {
    const answerId = newId();
    await db.insert(surveyAnswers).values({
      id: answerId,
      responseId,
      questionId: a.questionId,
      textAnswer: a.textAnswer,
    });
    for (const optionId of a.optionIds) {
      await db.insert(surveyAnswerOptions).values({ id: newId(), answerId, optionId });
    }
  }

  return redirectWithMessage(request, `/surveys/${surveyId}`, { ok: "回答を送信しました" });
}
