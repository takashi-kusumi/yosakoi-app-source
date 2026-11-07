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

/** 「11/15(土) 18:00」のような短い表記。カードや一覧向け */
export function formatEventDate(date: Date | string | null): string {
  if (!date) return "日時未定";
  const p = jstParts(typeof date === "string" ? new Date(date) : date);
  return `${p.month}/${p.day}(${p.weekday}) ${p.time}`;
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
