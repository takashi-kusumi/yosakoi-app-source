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
  const { pathname } = request.nextUrl;
  const session = await readSession(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "admin_only");
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/events/:path*", "/tools/:path*", "/notices/:path*", "/surveys/:path*", "/admin/:path*"],
};
