import "server-only";

export type GoogleProfile = {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
};

/** GoogleログインのOAuthクライアントが設定されているか（未設定ならログイン画面にボタンを出さない） */
export function isGoogleLoginConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function buildGoogleAuthorizeUrl(params: { state: string; redirectUri: string }): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID が設定されていません");
  }
  const search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: params.redirectUri,
    state: params.state,
    scope: "openid email profile",
    // 複数のGoogleアカウントを使っている人が、毎回使うアカウントを選べるようにする
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${search.toString()}`;
}

export async function exchangeGoogleCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
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
    throw new Error(`Googleトークン取得に失敗しました (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Googleプロフィール取得に失敗しました (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!data.sub) {
    throw new Error("Googleアカウントの識別子を取得できませんでした");
  }
  return {
    sub: data.sub,
    email: data.email,
    emailVerified: data.email_verified,
    name: data.name,
    picture: data.picture,
  };
}
