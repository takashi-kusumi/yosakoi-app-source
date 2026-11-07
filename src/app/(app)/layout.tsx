import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getPendingEventCountForMember } from "@/lib/queries";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/login");
  }

  const pendingEvents = await getPendingEventCountForMember(member.id);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <TopBar
        displayName={member.displayName}
        pictureUrl={member.pictureUrl}
        isAdmin={member.role === "ADMIN"}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-4">{children}</main>
      <BottomNav isAdmin={member.role === "ADMIN"} pendingEvents={pendingEvents} />
    </div>
  );
}
