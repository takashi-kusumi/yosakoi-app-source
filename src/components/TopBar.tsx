import Link from "next/link";

export function TopBar({
  displayName,
  role,
}: {
  displayName: string;
  role: "ADMIN" | "MEMBER";
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-lg">🎋</span>
        <span className="text-sm font-bold text-neutral-900">
          よさこいチーム管理
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/*
          管理者も含め、誰でも常に登録情報（学年・パート・部員の種類・メールアドレス）を
          見直せるように、ここから常時 /register へ遷移できるようにする。
          ダッシュボードのバナーはTRIAL（体験）の人にしか出ないため、その補完。
        */}
        <Link href="/register" className="text-right">
          <p className="text-xs font-semibold text-neutral-700">
            {displayName}
            {role === "ADMIN" && (
              <span className="ml-1 text-[10px] font-medium text-orange-600">
                管理者
              </span>
            )}
          </p>
          <p className="text-[10px] text-neutral-400">登録情報 ›</p>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
