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
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-base">
            🎋
          </span>
          <span className="text-[15px] font-bold tracking-tight text-neutral-900">よさこいチーム</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Avatar name={displayName} pictureUrl={pictureUrl} size={28} />
            <div className="hidden text-right sm:block">
              <p className="max-w-32 truncate text-xs font-semibold text-neutral-700">{displayName}</p>
              {isAdmin && <p className="text-[10px] font-medium text-orange-600">管理者</p>}
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
