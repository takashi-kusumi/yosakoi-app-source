import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthorizeUrl } from "@/lib/google";
import { resolveAppUrl } from "@/lib/appUrl";
import { newId } from "@/lib/id";

export async function GET(request: NextRequest) {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const state = newId();

  let authorizeUrl: string;
  try {
    authorizeUrl = buildGoogleAuthorizeUrl({ state, redirectUri });
  } catch (err) {
    const message = err instanceof Error ? err.message : "設定エラー";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, appUrl));
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
