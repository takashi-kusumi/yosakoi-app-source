import "server-only";

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
};

/**
 * このアプリが動いているURLを決定する。
 * 環境変数 APP_URL を優先し、無ければリクエストの origin を使う。
 */
export function resolveAppUrl(requestOrigin: string): string {
  return process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
}

export function buildLineAuthorizeUrl(params: {
  state: string;
  redirectUri: string;
}): string {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    throw new Error("LINE_LOGIN_CHANNEL_ID が設定されていません");
  }
  const search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: "profile openid",
    // LINE公式アカウント（Messaging API）と友だち追加を促す。
    // LINEログインチャンネルにOAが連携されていない場合は無視される。
    bot_prompt: "aggressive",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${search.toString()}`;
}

export async function exchangeLineCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string }> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET が設定されていません"
    );
  }
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINEトークン取得に失敗しました (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchLineProfile(
  accessToken: string
): Promise<LineProfile> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINEプロフィール取得に失敗しました (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * LINE Messaging API でユーザーにプッシュメッセージを送信する。
 * 送信先ユーザーは、LINE公式アカウントを友だち追加している必要がある。
 */
export async function pushLineMessage(
  to: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: "LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が設定されていません",
    };
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `LINE送信エラー (${res.status}): ${body}` };
  }
  return { ok: true };
}
