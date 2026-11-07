import Link from "next/link";
import { getAllMembers } from "@/lib/queries";
import { getCurrentMember } from "@/lib/auth";
import { FlashMessage } from "@/components/FlashMessage";
import { Avatar } from "@/components/Avatar";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const [memberList, me] = await Promise.all([getAllMembers(), getCurrentMember()]);

  const btn = "rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50";

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <Link href="/admin" className="text-sm font-semibold text-neutral-500">
        ‹ 管理
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">メンバー管理</h1>
        <p className="mt-1 text-xs text-neutral-400">
          Googleでログインした人が自動で追加されます（{memberList.length}人）。利用停止にした人はログインできなくなります。
        </p>
      </div>

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {memberList.map((m) => (
          <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${m.isActive ? "" : "bg-neutral-50"}`}>
            <Avatar name={m.displayName} pictureUrl={m.pictureUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-neutral-800">
                <span className="truncate">{m.displayName}</span>
                {m.role === "ADMIN" && (
                  <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                    管理者
                  </span>
                )}
                {!m.isActive && (
                  <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">
                    利用停止中
                  </span>
                )}
              </p>
              {m.googleEmail && <p className="truncate text-[11px] text-neutral-400">{m.googleEmail}</p>}
            </div>
            {m.id !== me?.id && (
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <form action={`/api/admin/members/${m.id}`} method="POST">
                  <input type="hidden" name="action" value="toggleRole" />
                  <button type="submit" className={`${btn} w-full`}>
                    {m.role === "ADMIN" ? "一般にする" : "管理者にする"}
                  </button>
                </form>
                <form action={`/api/admin/members/${m.id}`} method="POST">
                  <input type="hidden" name="action" value="toggleActive" />
                  <button type="submit" className={`${btn} w-full`}>
                    {m.isActive ? "利用停止" : "利用再開"}
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
