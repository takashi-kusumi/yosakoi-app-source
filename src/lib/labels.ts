export const EVENT_TYPE_LABELS: Record<string, string> = {
  PRACTICE: "練習",
  FESTIVAL: "よさこい祭り",
  PARTY: "飲み会・イベント",
};

export const EVENT_TYPE_OPTIONS = [
  { value: "PRACTICE", label: "練習" },
  { value: "FESTIVAL", label: "よさこい祭り" },
  { value: "PARTY", label: "飲み会・イベント" },
] as const;

export const VALID_EVENT_TYPES = ["PRACTICE", "FESTIVAL", "PARTY"] as const;
export type EventTypeValue = (typeof VALID_EVENT_TYPES)[number];

/** 種類ごとの色（チップ・カレンダーの帯に使う）。ひと目で練習とイベントを見分けられるようにする */
export const EVENT_TYPE_CHIP_CLASS: Record<string, string> = {
  PRACTICE: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  FESTIVAL: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  PARTY: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
};
export const EVENT_TYPE_BAR_CLASS: Record<string, string> = {
  PRACTICE: "bg-sky-500",
  FESTIVAL: "bg-orange-500",
  PARTY: "bg-violet-500",
};

export const MAX_RESPONSE_NOTE_LENGTH = 100;
export const MAX_COMMENT_LENGTH = 500;

export const STATUS_SHORT: Record<string, string> = { ATTENDING: "参加", NOT_ATTENDING: "不参加", UNDECIDED: "未定" };

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "日時未定";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

function jstParts(d: Date) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    month: get("month"),
    day: get("day"),
    weekday: get("weekday"),
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** 「18:30」のようなJSTの時刻 */
export function formatTime(date: Date | string | null): string {
  if (!date) return "";
  return jstParts(typeof date === "string" ? new Date(date) : date).time;
}

/** 「18:30〜21:00」または終了時刻が無い場合は「18:30〜」 */
export function formatTimeRange(start: Date | string | null, end?: Date | string | null): string {
  if (!start) return "";
  return `${formatTime(start)}〜${end ? formatTime(end) : ""}`;
}

/** 「11/15(土) 18:00〜21:00」のような短い表記。カードや詳細向け */
export function formatEventDate(date: Date | string | null, end?: Date | string | null): string {
  if (!date) return "日時未定";
  const p = jstParts(typeof date === "string" ? new Date(date) : date);
  return `${p.month}/${p.day}(${p.weekday}) ${formatTimeRange(date, end)}`;
}

/** <input type="time"> の value 用に、JSTの "HH:mm" を返す */
export function toTimeInputValue(date: Date | string | null): string {
  return date ? formatTime(date) : "";
}

/**
 * 終了時刻（"HH:mm"）を、開始日時と同じ日（JST）の日時に変換する。
 * 開始時刻以前の時刻が入力された場合は、日付をまたいだもの（翌日）として扱う。
 * 開始日時が無い・形式が不正な場合は null。
 */
export function resolveEndDate(start: Date | null, endTime: string): Date | null {
  const t = endTime.trim();
  if (!start || !/^\d{2}:\d{2}$/.test(t)) return null;
  const startLocal = toDatetimeLocalValue(start); // "YYYY-MM-DDTHH:mm"（JST）
  const end = new Date(`${startLocal.slice(0, 10)}T${t}:00+09:00`);
  if (Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) end.setTime(end.getTime() + 24 * 60 * 60 * 1000);
  return end;
}

/** カードの左側に置く日付ブロック用（月・日・曜日・時刻を別々に返す） */
export function eventDateBlock(date: Date | string | null) {
  if (!date) return null;
  return jstParts(typeof date === "string" ? new Date(date) : date);
}

export const STATUS_DOT_CLASS: Record<string, string> = {
  ATTENDING: "bg-emerald-500",
  NOT_ATTENDING: "bg-neutral-400",
  UNDECIDED: "bg-sky-400",
};
export const UNANSWERED_DOT_CLASS = "bg-amber-400";

export const STATUS_BADGE_CLASS: Record<string, string> = {
  ATTENDING: "bg-emerald-50 text-emerald-700",
  NOT_ATTENDING: "bg-neutral-100 text-neutral-500",
  UNDECIDED: "bg-sky-50 text-sky-700",
};
export const UNANSWERED_BADGE_CLASS = "bg-amber-50 text-amber-700";

export const STATUS_TEXT_CLASS: Record<string, string> = {
  ATTENDING: "text-emerald-600",
  NOT_ATTENDING: "text-neutral-400",
  UNDECIDED: "text-sky-600",
};

export const STATUS_LABEL: Record<string, string> = {
  ATTENDING: "参加",
  NOT_ATTENDING: "不参加",
  UNDECIDED: "未定",
};

/** <input type="datetime-local"> の value 用に、JSTの "YYYY-MM-DDTHH:mm" を返す */
export function toDatetimeLocalValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * <input type="datetime-local"> の "YYYY-MM-DDTHH:mm" 文字列を、
 * JST（日本時間）の時刻として解釈しDateに変換する。
 * サーバーの実行タイムゾーンに依存させないための処理。
 */
export function parseJstDatetimeLocal(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ==================== 回答の受付・締切 ====================

/**
 * 予定が実際に回答受付中かどうか。isOpen=true でも、回答締切（responseDeadline）を
 * 過ぎていれば締め切り扱いにする（管理者が手動で締め切るのを待たない）。
 */
export function isEventOpen(event: {
  isOpen: boolean;
  responseDeadline?: Date | string | null;
}): boolean {
  if (!event.isOpen) return false;
  if (event.responseDeadline && new Date(event.responseDeadline).getTime() <= Date.now()) return false;
  return true;
}

/**
 * アンケートが実際に回答受付中かどうか（isOpen && 締切前）。
 */
export function isSurveyOpen(survey: { isOpen: boolean; closesAt: Date | string | null }): boolean {
  if (!survey.isOpen) return false;
  if (survey.closesAt && new Date(survey.closesAt).getTime() <= Date.now()) return false;
  return true;
}

/** 締切までの残り時間を「あと3日」「今日 21:00まで」「あと2時間」のように表す（過ぎていればnull） */
export function deadlineLabel(deadline: Date | string | null | undefined): string | null {
  if (!deadline) return null;
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = diff / (60 * 60 * 1000);
  if (hours < 1) return "まもなく締切";
  if (hours < 24) {
    return `締切 ${formatTime(d)}（あと${Math.floor(hours)}時間）`;
  }
  const p = jstParts(d);
  return `締切 ${p.month}/${p.day}(${p.weekday}) ${p.time}（あと${Math.floor(hours / 24)}日）`;
}

// ==================== アンケート ====================

export const SURVEY_QUESTION_TYPE_LABELS: Record<string, string> = {
  TEXT: "自由記述",
  SINGLE: "単一選択",
  MULTI: "複数選択",
};

export const SURVEY_QUESTION_TYPE_OPTIONS = [
  { value: "TEXT", label: "自由記述" },
  { value: "SINGLE", label: "単一選択（1つだけ選ぶ）" },
  { value: "MULTI", label: "複数選択（複数選べる）" },
] as const;

export const VALID_SURVEY_QUESTION_TYPES = ["TEXT", "SINGLE", "MULTI"] as const;
export type SurveyQuestionType = (typeof VALID_SURVEY_QUESTION_TYPES)[number];
