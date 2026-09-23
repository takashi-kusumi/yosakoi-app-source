import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "yosakoi_session";

export type SessionPayload = {
  memberId: string;
  role: "ADMIN" | "MEMBER";
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET が設定されていません。.env に32文字以上のランダムな文字列を設定してください。"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.memberId === "string" &&
      (payload.role === "ADMIN" || payload.role === "MEMBER")
    ) {
      return { memberId: payload.memberId, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentMember() {
  const session = await getSession();
  if (!session) return null;
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId))
    .limit(1);
  if (!member || !member.isActive) return null;
  return member;
}

export async function requireAdmin() {
  const member = await getCurrentMember();
  if (!member || member.role !== "ADMIN") {
    throw new Error("管理者権限が必要です");
  }
  return member;
}
