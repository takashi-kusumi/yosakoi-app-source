import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEventWithResponses } from "@/lib/queries";
import { STATUS_LABEL, formatDateTime } from "@/lib/labels";
import { resolveAppUrl } from "@/lib/appUrl";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    const appUrl = resolveAppUrl(request.nextUrl.origin);
    const url = new URL("/dashboard", appUrl);
    url.searchParams.set("error", "管理者のみ操作できます");
    return NextResponse.redirect(url);
  }

  const { id: eventId } = await context.params;
  const detail = await getEventWithResponses(eventId);
  if (!detail) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }

  const rows: string[] = ["メンバー名,区分,回答,メモ,回答日時,代理入力"];

  for (const { member, response } of detail.answered) {
    rows.push(
      [
        csvEscape(member.displayName),
        member.isGuest ? "体験参加" : "メンバー",
        csvEscape(STATUS_LABEL[response.status] ?? response.status),
        csvEscape(response.note ?? ""),
        csvEscape(formatDateTime(response.respondedAt)),
        response.proxyBy ? "代理入力" : "",
      ].join(",")
    );
  }
  for (const member of detail.unanswered) {
    rows.push([csvEscape(member.displayName), "メンバー", "未回答", "", "", ""].join(","));
  }

  // Excelでの文字化けを避けるためUTF-8 BOMを付与
  const bom = "﻿";
  const csv = bom + rows.join("\r\n") + "\r\n";

  const safeTitle = detail.event.title.replace(/[\\/:*?"<>|]/g, "_");
  const fallbackName = `event_${eventId}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(
        safeTitle
      )}.csv`,
    },
  });
}
