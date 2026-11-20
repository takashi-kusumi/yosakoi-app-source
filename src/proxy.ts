import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "yosakoi_session";

function secretKey() {
  const secret = process.env.SESSION_SECRET || "";
  return new TextEncoder().encode(secret);
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.memberId === "string" &&
      (payload.role === "ADMIN" || payload.role === "MEMBER")
    ) {
      return { memberId: payload.memberId, role: payload.role as string };
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const session = await readSession(request);

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 管理画面に入れるかどうかは、ここ（クッキーの役割）ではなく admin/layout.tsx でデータベースの最新の役割を見て判定する。
  // クッキーの役割はログインした時点のもので、あとから「管理者にする」「一般にする」を押しても変わらないため。

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/notices/:path*",
    "/surveys/:path*",
    "/me/:path*",
    "/help/:path*",
    "/welcome/:path*",
    "/admin/:path*",
  ],
};
