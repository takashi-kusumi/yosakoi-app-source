import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { EVENT_TYPE_LABELS } from "@/lib/labels";

/**
 * Googleカレンダー連携（サービスアカウント方式）。
 * 環境変数:
 *   GOOGLE_CALENDAR_ID            予定を書き込むカレンダーのID（カレンダーの設定 →「カレンダーの統合」に表示）
 *   GOOGLE_SERVICE_ACCOUNT_JSON   サービスアカウントの鍵（JSONファイルの中身をそのまま貼り付け）
 * カレンダー側で、サービスアカウントのメールアドレスに「予定の変更」権限を共有しておく必要がある。
 * 連携は「できるだけ反映する」方針で、失敗してもアプリ側の操作は止めない（呼び出し側でメッセージを出す）。
 */

type ServiceAccount = { client_email: string; private_key: string };

function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export function isCalendarSyncConfigured(): boolean {
  return !!process.env.GOOGLE_CALENDAR_ID && !!readServiceAccount();
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const sa = readServiceAccount();
  if (!sa) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON が正しく設定されていません");

  const key = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/calendar.events" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Googleの認証に失敗しました (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function calendarEventsUrl(eventId?: string) {
  const cal = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID ?? "");
  const base = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

type SyncableEvent = {
  id: string;
  type: string;
  title: string;
  eventDate: Date | null;
  endDate: Date | null;
  location: string | null;
  description: string | null;
  feeAmount: number | null;
  googleCalendarEventId: string | null;
};

function buildBody(event: SyncableEvent, appUrl: string) {
  const start = event.eventDate!;
  // 終了時刻が無い予定は、カレンダー上は1時間の予定として登録する
  const end = event.endDate ?? new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    event.description ?? "",
    event.feeAmount != null ? `参加費: ${event.feeAmount.toLocaleString()}円` : "",
    `出欠の回答はこちら: ${appUrl}/events/${event.id}`,
  ].filter(Boolean);
  return {
    summary: `【${EVENT_TYPE_LABELS[event.type] ?? "予定"}】${event.title}`,
    location: event.location ?? undefined,
    description: lines.join("\n\n"),
    start: { dateTime: start.toISOString(), timeZone: "Asia/Tokyo" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Tokyo" },
  };
}

async function deleteRemote(googleEventId: string, token: string) {
  const res = await fetch(calendarEventsUrl(googleEventId), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // 既にカレンダー側で消されている場合（404/410）は成功扱い
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Googleカレンダーの予定の削除に失敗しました (${res.status})`);
  }
}

export type SyncResult =
  | { status: "skipped" }
  | { status: "ok"; googleCalendarEventId: string | null }
  | { status: "error"; message: string };

/**
 * 予定をGoogleカレンダーに反映する（作成・更新）。日時未定の予定はカレンダーから外す。
 * 戻り値の googleCalendarEventId を events テーブルに保存すること。
 */
export async function syncEventToCalendar(event: SyncableEvent, appUrl: string): Promise<SyncResult> {
  if (!isCalendarSyncConfigured()) return { status: "skipped" };
  try {
    const token = await getAccessToken();

    if (!event.eventDate) {
      if (event.googleCalendarEventId) await deleteRemote(event.googleCalendarEventId, token);
      return { status: "ok", googleCalendarEventId: null };
    }

    const body = JSON.stringify(buildBody(event, appUrl));
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    if (event.googleCalendarEventId) {
      const res = await fetch(calendarEventsUrl(event.googleCalendarEventId), {
        method: "PATCH",
        headers,
        body,
        cache: "no-store",
      });
      if (res.ok) return { status: "ok", googleCalendarEventId: event.googleCalendarEventId };
      // カレンダー側で予定が消されていた場合は、作り直す
      if (res.status !== 404 && res.status !== 410) {
        throw new Error(`Googleカレンダーの予定の更新に失敗しました (${res.status}): ${await res.text()}`);
      }
    }

    const res = await fetch(calendarEventsUrl(), { method: "POST", headers, body, cache: "no-store" });
    if (!res.ok) throw new Error(`Googleカレンダーへの登録に失敗しました (${res.status}): ${await res.text()}`);
    const created = (await res.json()) as { id: string };
    return { status: "ok", googleCalendarEventId: created.id };
  } catch (err) {
    console.error("[googleCalendar] sync failed", err);
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export async function removeEventFromCalendar(googleEventId: string | null): Promise<SyncResult> {
  if (!googleEventId || !isCalendarSyncConfigured()) return { status: "skipped" };
  try {
    await deleteRemote(googleEventId, await getAccessToken());
    return { status: "ok", googleCalendarEventId: null };
  } catch (err) {
    console.error("[googleCalendar] delete failed", err);
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

/** 予定の作成・更新後に呼ぶ: カレンダーへ反映し、IDをDBに保存する。失敗時はメッセージの補足文を返す */
export const CALENDAR_ERROR_NOTE = "（Googleカレンダーへの反映に失敗しました。管理画面の「カレンダーに再反映」をお試しください）";
