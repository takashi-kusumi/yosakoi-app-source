import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exchangeLineCodeForToken, fetchLineProfile, resolveAppUrl } from "@/lib/line";
import { createSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: NextRequest) {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const lineError = searchParams.get("error");
  const savedState = request.cookies.get("line_oauth_state")?.value;

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, appUrl)
    );

  if (lineError) {
    return fail(`LINEログインがキャンセルされました (${lineError})`);
  }
  if (!code || !state || !savedState || state !== savedState) {
    return fail("ログイン処理の検証に失敗しました。もう一度お試しください。");
  }

  try {
    const redirectUri = `${appUrl}/api/auth/line/callback`;
    const tokenResult = await exchangeLineCodeForToken(code, redirectUri);
    const profile = await fetchLineProfile(tokenResult.access_token);

    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.lineUserId, profile.userId))
      .limit(1);

    let member = existing;

    if (!member) {
      // まだ管理者が一人もいない場合、最初にログインした人が自動的に管理者になる。
      const existingAdmins = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.role, "ADMIN"))
        .limit(1);
      const hasAdmin = existingAdmins.length > 0;

      const [created] = await db
        .insert(members)
        .values({
          id: newId(),
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          role: hasAdmin ? "MEMBER" : "ADMIN",
          // 最初のログイン者（自動的に管理者になる人）はチームの立ち上げ者なので、
          // 体験登録を挟まず最初から正部員として扱う。それ以外は体験（仮登録）から開始する。
          membershipStatus: hasAdmin ? "TRIAL" : "REGULAR",
        })
        .returning();
      member = created;
    } else if (member.pictureUrl !== profile.pictureUrl) {
      const [updated] = await db
        .update(members)
        .set({ pictureUrl: profile.pictureUrl, updatedAt: new Date() })
        .where(eq(members.id, member.id))
        .returning();
      member = updated;
    }

    if (!member.isActive) {
      return fail("アカウントが無効化されています。管理者にご連絡ください。");
    }

    await createSession({ memberId: member.id, role: member.role });

    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    response.cookies.delete("line_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ログインに失敗しました";
    return fail(message);
  }
}
