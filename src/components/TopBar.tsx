import Link from "next/link";
import { Avatar } from "@/components/Avatar";

export function TopBar({
  displayName,
  pictureUrl,
  isAdmin,
}: {
  displayName: string;
  pictureUrl: string | null;
  isAdmin: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-base">🎋</span>
          <span className="text-[15px] font-bold tracking-tight text-neutral-900">よさこいチーム</span>
        </Link>
        <Link
          href="/me"
          aria-label="プロフィール"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-neutral-100"
        >
          <Avatar name={displayName} pictureUrl={pictureUrl} size={28} />
          <span className="max-w-28 truncate text-xs font-semibold text-neutral-700">{displayName}</span>
          {isAdmin && (
            <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">管理者</span>
          )}
        </Link>
      </div>
    </header>
  );
}
