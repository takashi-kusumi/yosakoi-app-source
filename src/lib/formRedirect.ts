import { NextRequest, NextResponse } from "next/server";
import { resolveAppUrl } from "@/lib/line";

/**
 * フォーム送信後のリダイレクト先を安全に決定する。
 * オープンリダイレクト対策として、サイト内の相対パスのみ許可する。
 */
export function safeRedirectTarget(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function redirectWithMessage(
  request: NextRequest,
  path: string,
  params?: Record<string, string>
) {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const url = new URL(path, appUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return NextResponse.redirect(url, { status: 303 });
}
