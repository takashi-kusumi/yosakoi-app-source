import "server-only";
import { headers } from "next/headers";
import { resolveAppUrl } from "@/lib/appUrl";

/** サーバーコンポーネント内で、アプリの公開URL（APP_URL優先）を得る */
export async function getAppUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return resolveAppUrl(`${proto}://${host}`);
}
