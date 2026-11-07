import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { resolveAppUrl } from "@/lib/appUrl";

export async function POST(request: NextRequest) {
  await destroySession();
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  return NextResponse.redirect(new URL("/login", appUrl));
}
