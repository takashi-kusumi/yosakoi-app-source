import "server-only";
import { db } from "@/db";
import { surveyQuestions, surveyOptions } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { newId } from "@/lib/id";
import { VALID_SURVEY_QUESTION_TYPES, type SurveyQuestionType } from "@/lib/labels";

export type ParsedSurveyQuestion = {
  type: SurveyQuestionType;
  questionText: string;
  required: boolean;
  options: string[];
};

type ParseResult =
  | { ok: true; questions: ParsedSurveyQuestion[] }
  | { ok: false; error: string };

/**
 * SurveyQuestionBuilder（クライアント側）が hidden input に詰めたJSON文字列を検証・整形する。
 */
export function parseQuestionsJson(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "質問の形式が不正です" };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, error: "質問を1つ以上追加してください" };
  }

  const questions: ParsedSurveyQuestion[] = [];

  for (const raw of data) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "質問の形式が不正です" };
    }
    const item = raw as Record<string, unknown>;
    const type = String(item.type ?? "");
    const questionText = String(item.questionText ?? "").trim();
    const required = Boolean(item.required);
    const rawOptions = Array.isArray(item.options) ? item.options : [];

    if (!VALID_SURVEY_QUESTION_TYPES.includes(type as SurveyQuestionType)) {
      return { ok: false, error: "回答形式が不正な質問があります" };
    }
    if (!questionText) {
      return { ok: false, error: "すべての質問に質問内容を入力してください" };
    }

    if (type === "TEXT") {
      questions.push({ type: "TEXT", questionText, required, options: [] });
      continue;
    }

    const options = rawOptions
      .map((o) => String(o).trim())
      .filter((o) => o.length > 0);

    if (options.length < 2) {
      return { ok: false, error: `「${questionText}」の選択肢は2つ以上入力してください` };
    }

    questions.push({ type: type as SurveyQuestionType, questionText, required, options });
  }

  return { ok: true, questions };
}

/**
 * 保存済みの質問一式と、フォームから送られてきた質問一式が「実質的に同じ」かどうかを判定する。
 * 質問数・種類・質問文・必須有無・選択肢（内容と順序）が完全に一致する場合のみ true。
 * タイトル・説明・対象者だけを変更した保存では、質問ビルダーが既存の質問をそのまま
 * 送り返してくるため、ここで一致と判定して replaceSurveyQuestions を呼ばず、
 * 既存の回答（surveyAnswers等）を消さずに残す。
 */
export async function haveQuestionsChanged(
  surveyId: string,
  next: ParsedSurveyQuestion[]
): Promise<boolean> {
  const existingQuestions = await db
    .select()
    .from(surveyQuestions)
    .where(eq(surveyQuestions.surveyId, surveyId))
    .orderBy(asc(surveyQuestions.order));

  if (existingQuestions.length !== next.length) return true;

  const existingOptions = existingQuestions.length
    ? await db
        .select()
        .from(surveyOptions)
        .where(
          inArray(
            surveyOptions.questionId,
            existingQuestions.map((q) => q.id)
          )
        )
        .orderBy(asc(surveyOptions.order))
    : [];
  const optionLabelsByQuestion = new Map<string, string[]>();
  for (const o of existingOptions) {
    const list = optionLabelsByQuestion.get(o.questionId) ?? [];
    list.push(o.label);
    optionLabelsByQuestion.set(o.questionId, list);
  }

  for (let i = 0; i < existingQuestions.length; i++) {
    const existing = existingQuestions[i];
    const incoming = next[i];
    const existingOptionLabels = optionLabelsByQuestion.get(existing.id) ?? [];

    if (
      existing.type !== incoming.type ||
      existing.questionText !== incoming.questionText ||
      existing.required !== incoming.required ||
      existingOptionLabels.length !== incoming.options.length ||
      existingOptionLabels.some((label, idx) => label !== incoming.options[idx])
    ) {
      return true;
    }
  }

  return false;
}

/**
 * アンケートの質問一式を丸ごと置き換える。
 * 既存の質問を削除すると、紐づく選択肢・回答も連鎖削除される（DBのonDelete cascadeによる）。
 * 質問の追加・削除・文言変更をした場合に既存回答が失われるのはこの実装上の割り切りで、
 * UI側で警告を表示する。呼び出し側は haveQuestionsChanged() で実質的な変更がある場合のみ
 * これを呼び出すこと（変更が無ければ既存回答を保持するため呼ばない）。
 */
export async function replaceSurveyQuestions(
  surveyId: string,
  questions: ParsedSurveyQuestion[]
) {
  await db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, surveyId));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const questionId = newId();
    await db.insert(surveyQuestions).values({
      id: questionId,
      surveyId,
      type: q.type,
      questionText: q.questionText,
      required: q.required,
      order: i,
    });

    if (q.type !== "TEXT") {
      for (let j = 0; j < q.options.length; j++) {
        await db.insert(surveyOptions).values({
          id: newId(),
          questionId,
          order: j,
          label: q.options[j],
        });
      }
    }
  }
}
