import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import {
  getPendingEventCountForMember,
  getPendingSurveyCountForMember,
  getUnreadNoticeCount,
} from "@/lib/queries";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/login");
  }

  // 行動規範URLが設定されている場合、まだ同意していない部員は同意画面へ誘導する
  if (process.env.CODE_OF_CONDUCT_URL && !member.codeOfConductAgreedAt) {
    redirect("/consent");
  }

  const [pendingEvents, pendingSurveys, unreadNotices] = await Promise.all([
    getPendingEventCountForMember(member.id),
    getPendingSurveyCountForMember(member.id),
    getUnreadNoticeCount(member.lastSeenNoticesAt),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <TopBar displayName={member.displayName} role={member.role} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 lg:max-w-5xl">
        {children}
      </main>
      <BottomNav
        isAdmin={member.role === "ADMIN"}
        badges={{ events: pendingEvents, surveys: pendingSurveys, notices: unreadNotices }}
      />
    </div>
  );
}
