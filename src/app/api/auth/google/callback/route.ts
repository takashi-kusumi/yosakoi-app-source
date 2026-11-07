import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { exchangeGoogleCodeForToken, fetchGoogleProfile } from "@/lib/google";
import { resolveAppUrl } from "@/lib/appUrl";
import { createSession } from "@/lib/auth";
import { newId } from "@/lib/id";

export async function GET(request: NextRequest) {
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");
  const savedState = request.cookies.get("google_oauth_state")?.value;

  const fail = (message: string) => {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, appUrl)
    );
    response.cookies.delete("google_oauth_state");
    return response;
  };

  if (googleError) {
    return fail(`Googleログインがキャンセルされました (${googleError})`);
  }
  if (!code || !state || !savedState || state !== savedState) {
    return fail("ログイン処理の検証に失敗しました。もう一度お試しください。");
  }

  try {
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const tokenResult = await exchangeGoogleCodeForToken(code, redirectUri);
    const profile = await fetchGoogleProfile(tokenResult.access_token);

    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.googleSub, profile.sub))
      .limit(1);

    let member = existing;

    if (!member) {
      // まだ管理者が一人もいない場合、最初にログインした人が自動的に管理者になる。
      // それ以外の人は、ログインするだけでそのままメンバーとして使える（部員登録は不要）。
      const existingAdmins = await db
        .select({ id: members.id })
        .from(members)
        .where(eq(members.role, "ADMIN"))
        .limit(1);
      const hasAdmin = existingAdmins.length > 0;

      const displayName =
        profile.name?.trim() || profile.email?.split("@")[0] || "メンバー";

      const [created] = await db
        .insert(members)
        .values({
          id: newId(),
          googleSub: profile.sub,
          googleEmail: profile.email ?? null,
          displayName,
          pictureUrl: profile.picture,
          role: hasAdmin ? "MEMBER" : "ADMIN",
        })
        .returning();
      member = created;
    } else if (
      (profile.picture && member.pictureUrl !== profile.picture) ||
      (profile.email ?? null) !== member.googleEmail
    ) {
      const [updated] = await db
        .update(members)
        .set({
          pictureUrl: profile.picture ?? member.pictureUrl,
          googleEmail: profile.email ?? null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id))
        .returning();
      member = updated;
    }

    if (!member.isActive) {
      return fail("アカウントが無効化されています。管理者にご連絡ください。");
    }

    await createSession({ memberId: member.id, role: member.role });
    const response = NextResponse.redirect(new URL("/dashboard", appUrl));
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ログインに失敗しました";
    return fail(message);
  }
}
