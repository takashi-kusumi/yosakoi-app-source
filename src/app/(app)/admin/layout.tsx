import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

/**
 * 管理画面の入口。管理者かどうかはデータベースの最新の役割で判定する。
 * （ログイン時のクッキーに入っている役割は古いことがある。例: ログイン後に「管理者にする」を押された人）
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.role !== "ADMIN") {
    redirect(`/dashboard?error=${encodeURIComponent("管理者のみ利用できます")}`);
  }
  return <>{children}</>;
}
