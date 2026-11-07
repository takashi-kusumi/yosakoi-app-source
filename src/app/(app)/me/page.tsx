import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { FlashMessage } from "@/components/FlashMessage";
import { Avatar } from "@/components/Avatar";
import { Card, PageTitle } from "@/components/ui";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <PageTitle>プロフィール</PageTitle>

      <Card>
        <div className="flex items-center gap-3">
          <Avatar name={member.displayName} pictureUrl={member.pictureUrl} size={48} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-neutral-900">{member.displayName}</p>
            {member.googleEmail && <p className="truncate text-xs text-neutral-400">{member.googleEmail}</p>}
            {member.role === "ADMIN" && <p className="text-xs font-semibold text-orange-600">管理者</p>}
          </div>
        </div>

        <form action="/api/me" method="POST" className="mt-5 space-y-2">
          <input type="hidden" name="action" value="updateName" />
          <label htmlFor="fullName" className="block text-xs font-semibold text-neutral-600">
            フルネーム
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            minLength={2}
            maxLength={30}
            defaultValue={member.displayName}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <button type="submit" className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white">
            名前を変更する
          </button>
        </form>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <Link href="/help" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-neutral-700">
          📖 使い方を見る
          <span className="text-neutral-300">›</span>
        </Link>
        <form action="/api/auth/logout" method="POST" className="border-t border-neutral-100">
          <button type="submit" className="w-full px-4 py-3.5 text-left text-sm font-semibold text-red-500">
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}
