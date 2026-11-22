import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, members, responses } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { resolveAppUrl } from "@/lib/appUrl";
import { jstDateKey, jstTodayKey } from "@/lib/calendar";
import { VALID_EVENT_TYPES, formatTime } from "@/lib/labels";

/**
 * これからの予定をまとめた出欠一覧のCSV（管理者のみ）。
 * 形式: 1行目に予定名、2〜5行目に日付・時間・場所・参加人数、6行目からメンバーごとの回答。
 * 回答の記号: 参加=〇 / 不参加=× / 未定=△ / 未回答=-
 * ?type=PRACTICE などで予定の種類を絞り込める。
 */

const MARK: Record<string, string> = { ATTENDING: "〇", NOT_ATTENDING: "×", UNDECIDED: "△" };
const UNANSWERED = "-";

function cell(value: string): string {
  // Excelで数式として解釈されないようにする（=、+、@ で始まる名前や予定名など）
  let v = /^[=+@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** 「2026/2/27」（予定の日付。JST） */
function eventDay(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(d);
}

/** 「2026/09/03」（最終更新日。JST） */
function updatedDay(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    const url = new URL("/dashboard", resolveAppUrl(request.nextUrl.origin));
    url.searchParams.set("error", "管理者のみ操作できます");
    return NextResponse.redirect(url);
  }

  const typeParam = request.nextUrl.searchParams.get("type") ?? "";
  const type = (VALID_EVENT_TYPES as readonly string[]).includes(typeParam)
    ? (typeParam as (typeof VALID_EVENT_TYPES)[number])
    : null;

  // これからの予定（今日以降。日時未定の予定は最後）
  const todayKey = jstTodayKey();
  const upcoming = (await db.select().from(events).where(type ? eq(events.type, type) : undefined))
    .filter((e) => !e.eventDate || jstDateKey(e.eventDate) >= todayKey)
    .sort((a, b) => (a.eventDate?.getTime() ?? Infinity) - (b.eventDate?.getTime() ?? Infinity));
  const eventIds = upcoming.map((e) => e.id);

  const allResponses = eventIds.length
    ? await db.select().from(responses).where(inArray(responses.eventId, eventIds))
    : [];
  const byKey = new Map(allResponses.map((r) => [`${r.memberId}:${r.eventId}`, r]));

  const activeMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.isActive, true), eq(members.isGuest, false)))
    .orderBy(asc(members.createdAt));

  // 体験参加者は、どれかの予定に追加されている人だけを最後に並べる
  const respondedIds = [...new Set(allResponses.map((r) => r.memberId))];
  const guests = respondedIds.length
    ? await db
        .select()
        .from(members)
        .where(and(inArray(members.id, respondedIds), eq(members.isGuest, true)))
        .orderBy(asc(members.createdAt))
    : [];

  const attendingCount = (eventId: string) =>
    allResponses.filter((r) => r.eventId === eventId && r.status === "ATTENDING").length;

  const blank = ["", "", "", ""];
  const rows: string[][] = [
    ["Name", "Email", "最終更新日", "〇計", ...upcoming.map((e) => cell(e.title))],
    [...blank, ...upcoming.map((e) => (e.eventDate ? eventDay(e.eventDate) : "日時未定"))],
    [
      ...blank,
      ...upcoming.map((e) =>
        e.eventDate ? `${formatTime(e.eventDate)}~${e.endDate ? formatTime(e.endDate) : ""}` : ""
      ),
    ],
    [...blank, ...upcoming.map((e) => cell(e.location ?? ""))],
    [...blank, ...upcoming.map((e) => `〇 ${attendingCount(e.id)}`)],
  ];

  for (const m of [...activeMembers, ...guests]) {
    let total = 0;
    let lastUpdated: Date | null = null;
    const marks: string[] = [];
    for (const e of upcoming) {
      const r = byKey.get(`${m.id}:${e.id}`);
      if (!r) {
        marks.push(m.isGuest ? "" : UNANSWERED);
        continue;
      }
      if (r.status === "ATTENDING") total++;
      if (!lastUpdated || r.respondedAt > lastUpdated) lastUpdated = r.respondedAt;
      marks.push(MARK[r.status] ?? "");
    }
    rows.push([
      cell(m.isGuest ? `${m.displayName}（体験）` : m.displayName),
      cell(m.googleEmail ?? ""),
      lastUpdated ? updatedDay(lastUpdated) : "",
      String(total),
      ...marks,
    ]);
  }

  // Excelでの文字化けを避けるためUTF-8 BOMを付ける
  const csv = "﻿" + rows.map((r) => r.join(",")).join("\r\n") + "\r\n";
  const name = `これからの予定_${todayKey}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="upcoming_${todayKey}.csv"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
