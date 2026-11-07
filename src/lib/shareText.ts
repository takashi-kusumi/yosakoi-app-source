import { EVENT_TYPE_LABELS, eventDateBlock, formatEventDate } from "@/lib/labels";

/** 「11/20(金) 21:00」のような短い日時（締切の表示用） */
function shortDateTime(date: Date): string {
  const p = eventDateBlock(date)!;
  return `${p.month}/${p.day}(${p.weekday}) ${p.time}`;
}

/**
 * LINEのグループなどに貼り付ける告知文を作る（管理者向け）。
 * いずれもプレーンテキストで、最後にアプリのURLを付ける。
 */

export type ShareTemplate = { key: string; label: string; text: string };

const MAX_NAMES = 15;

/** 「山田さん、佐藤さん ほか3人」のような名前の並び */
export function namesLine(names: string[]): string {
  const shown = names.slice(0, MAX_NAMES).map((n) => `${n}さん`);
  const rest = names.length - shown.length;
  return shown.join("、") + (rest > 0 ? ` ほか${rest}人` : "");
}

type EventForShare = {
  id: string;
  type: string;
  title: string;
  eventDate: Date | null;
  endDate: Date | null;
  location: string | null;
  feeAmount: number | null;
  responseDeadline: Date | null;
};

function eventDetailLines(e: EventForShare): string[] {
  return [
    `📅 ${formatEventDate(e.eventDate, e.endDate)}`,
    `🏷 ${e.title}（${EVENT_TYPE_LABELS[e.type] ?? "予定"}）`,
    e.location ? `📍 ${e.location}` : "",
    e.feeAmount != null ? `💴 参加費 ${e.feeAmount.toLocaleString()}円` : "",
  ].filter(Boolean);
}

export function eventShareTemplates(
  e: EventForShare,
  opts: { appUrl: string; unansweredNames: string[]; attendingNames: string[] }
): ShareTemplate[] {
  const url = `${opts.appUrl}/events/${e.id}`;
  const deadline = e.responseDeadline ? `⏰ 回答締切 ${shortDateTime(e.responseDeadline)}` : "";

  const announce = [
    "【出欠回答のお願い】",
    ...eventDetailLines(e),
    deadline,
    "",
    "参加・未定・不参加をアプリで回答してください🙏",
    "遅刻・早退などはメモ欄にどうぞ。",
    `▼回答はこちら`,
    url,
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");

  const remind = [
    "【リマインド】出欠の回答がまだの方へ",
    ...eventDetailLines(e),
    deadline,
    "",
    opts.unansweredNames.length > 0
      ? `未回答（${opts.unansweredNames.length}人）: ${namesLine(opts.unansweredNames)}`
      : "全員の回答がそろいました。ありがとうございます！",
    "お手数ですが、回答をお願いします🙏",
    "▼回答はこちら",
    url,
  ];

  const guide = [
    `【ご案内】${e.title}`,
    ...eventDetailLines(e),
    "",
    opts.attendingNames.length > 0
      ? `参加予定（${opts.attendingNames.length}人）: ${namesLine(opts.attendingNames)}`
      : "参加予定の方はまだいません。",
    "予定が変わった方は、アプリで回答を変更してください。",
    "▼詳細はこちら",
    url,
  ];

  return [
    { key: "announce", label: "告知", text: announce.join("\n") },
    { key: "remind", label: "リマインド", text: remind.join("\n") },
    { key: "guide", label: "参加者への案内", text: guide.join("\n") },
  ];
}

export function surveyShareTemplates(
  s: { id: string; title: string; closesAt: Date | null },
  opts: { appUrl: string; unansweredNames: string[] }
): ShareTemplate[] {
  const url = `${opts.appUrl}/surveys/${s.id}`;
  const deadline = s.closesAt ? `⏰ 締切 ${shortDateTime(s.closesAt)}` : "";
  const announce = ["【アンケートのお願い】", `📋 ${s.title}`, deadline, "", "回答をお願いします🙏", "▼回答はこちら", url].filter(
    (l, i, arr) => l !== "" || arr[i - 1] !== ""
  );
  const remind = [
    "【リマインド】アンケートの回答がまだの方へ",
    `📋 ${s.title}`,
    deadline,
    "",
    opts.unansweredNames.length > 0
      ? `未回答（${opts.unansweredNames.length}人）: ${namesLine(opts.unansweredNames)}`
      : "全員の回答がそろいました。ありがとうございます！",
    "▼回答はこちら",
    url,
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");
  return [
    { key: "announce", label: "告知", text: announce.join("\n") },
    { key: "remind", label: "リマインド", text: remind.join("\n") },
  ];
}

export function noticeShareTemplates(
  n: { id: string; title: string; body: string | null },
  opts: { appUrl: string }
): ShareTemplate[] {
  const body = (n.body ?? "").trim();
  const excerpt = body.length > 120 ? `${body.slice(0, 120)}…` : body;
  const text = ["【お知らせ】" + n.title, excerpt ? `\n${excerpt}` : "", "", "▼詳しくはこちら", `${opts.appUrl}/notices/${n.id}`]
    .filter((l, i, arr) => l !== "" || arr[i - 1] !== "")
    .join("\n");
  return [{ key: "notice", label: "お知らせ", text }];
}

/** これからの予定をまとめた一覧（例: 今月の練習予定の共有） */
export function scheduleShareTemplate(rows: EventForShare[], opts: { appUrl: string }): ShareTemplate[] {
  const lines = rows.map(
    (e) => `・${formatEventDate(e.eventDate, e.endDate)} ${e.title}${e.location ? `（${e.location}）` : ""}`
  );
  const text = [
    "【これからの予定】",
    ...(lines.length > 0 ? lines : ["予定はまだありません"]),
    "",
    "出欠はアプリで回答してください🙏",
    "▼アプリはこちら",
    `${opts.appUrl}/dashboard`,
  ].join("\n");
  return [{ key: "schedule", label: "予定一覧", text }];
}
