import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMembershipFeeStatus } from "@/lib/queries";
import { pushLineMessage, resolveAppUrl } from "@/lib/line";
import { redirectWithMessage } from "@/lib/formRedirect";

/**
 * 年会費が未払いのメンバーへLINEでリマインドを送る。
 * イベント/アンケートのリマインド（remind, survey-remind）と同じパターン。
 * 金額レコードがまだ作成されていない人（fee=null）は「お願いする対象の金額」が
 * 決まっていないため送信対象に含めない。
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const theme = String(formData.get("theme") || "").trim();
  const customMessage = String(formData.get("message") || "").trim();

  if (!theme) {
    return redirectWithMessage(request, "/admin/fees", { error: "演舞テーマが不正です" });
  }

  const rows = await getMembershipFeeStatus(theme);
  const unpaidMembers = rows.filter((r) => r.fee && !r.fee.paid).map((r) => r.member);

  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const defaultMessage = `【リマインド】${theme}の年会費のお支払いがまだです。アプリから状況をご確認ください。\n${appUrl}/dashboard`;
  const message = customMessage || defaultMessage;

  let sent = 0;
  let skippedNoLine = 0;
  let failed = 0;

  for (const member of unpaidMembers) {
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

  return redirectWithMessage(request, `/admin/fees?theme=${theme}`, {
    ok: `送信完了: 成功${sent}件 / 失敗${failed}件 / LINE未連携${skippedNoLine}件`,
  });
}
