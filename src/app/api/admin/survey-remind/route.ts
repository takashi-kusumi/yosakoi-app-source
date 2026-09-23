import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSurveyResults } from "@/lib/queries";
import { pushLineMessage, resolveAppUrl } from "@/lib/line";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const surveyId = String(formData.get("surveyId") || "");
  const customMessage = String(formData.get("message") || "").trim();

  if (!surveyId) {
    return redirectWithMessage(request, "/admin/surveys", { error: "パラメーターが不正です" });
  }

  const results = await getSurveyResults(surveyId);
  if (!results) {
    return redirectWithMessage(request, "/admin/surveys", { error: "アンケートが見つかりません" });
  }

  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const defaultMessage = `【リマインド】アンケート「${results.survey.title}」の回答がまだです。アプリから回答をお願いします。\n${appUrl}/surveys/${surveyId}`;
  const message = customMessage || defaultMessage;

  let sent = 0;
  let skippedNoLine = 0;
  let failed = 0;

  for (const member of results.unansweredMembers) {
    if (!member.lineUserId) {
      skippedNoLine++;
      continue;
    }
    const result = await pushLineMessage(member.lineUserId, message);
    if (result.ok) {
      sent++;
    } else {
      failed++;
    }
  }

  return redirectWithMessage(request, `/admin/surveys/${surveyId}`, {
    ok: `送信完了: 成功${sent}件 / 失敗${failed}件 / LINE未連携${skippedNoLine}件`,
  });
}
