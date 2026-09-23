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

export const MEMBER_CATEGORY_LABELS: Record<string, string> = {
  PERFORMER: "演者（踊り子/中旗/道具演出）",
  SPECIALIST_FLAG: "専門職（大旗）",
  SPECIALIST_VOICE: "専門職（歌手/MC）",
  SUPPORT_GENERAL: "サポート（給水・鳴子拾い等）",
  SUPPORT_MEDIA: "サポート（撮影）",
  CHEER: "応援",
  OTHER: "その他",
};

export const MEMBER_CATEGORY_OPTIONS = [
  { value: "PERFORMER", label: "演者（踊り子/中旗/道具演出）" },
  { value: "SPECIALIST_FLAG", label: "専門職（大旗）" },
  { value: "SPECIALIST_VOICE", label: "専門職（歌手/MC）" },
  { value: "SUPPORT_GENERAL", label: "サポート（給水・鳴子拾い等）" },
  { value: "SUPPORT_MEDIA", label: "サポート（撮影）" },
  { value: "CHEER", label: "応援" },
  { value: "OTHER", label: "その他" },
] as const;

export const VALID_MEMBER_CATEGORIES = [
  "PERFORMER",
  "SPECIALIST_FLAG",
  "SPECIALIST_VOICE",
  "SUPPORT_GENERAL",
  "SUPPORT_MEDIA",
  "CHEER",
  "OTHER",
] as const;
export type MemberCategoryValue = (typeof VALID_MEMBER_CATEGORIES)[number];

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

export const STATUS_DOT_CLASS: Record<string, string> = {
  ATTENDING: "bg-orange-600",
  NOT_ATTENDING: "bg-neutral-400",
};
export const UNANSWERED_DOT_CLASS = "bg-amber-400";

export const STATUS_BADGE_CLASS: Record<string, string> = {
  ATTENDING: "bg-orange-100 text-orange-700",
  NOT_ATTENDING: "bg-neutral-100 text-neutral-500",
};
export const UNANSWERED_BADGE_CLASS = "bg-amber-50 text-amber-700";

export const STATUS_LABEL: Record<string, string> = {
  ATTENDING: "参加",
  NOT_ATTENDING: "不参加",
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

export function formatDate(date: Date | string | null): string {
  if (!date) return "日時未定";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
}
