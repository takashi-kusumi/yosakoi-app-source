import { getAllMembers, getMemberCategoriesForTheme, getCurrentTheme } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { MEMBER_CATEGORY_LABELS } from "@/lib/labels";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const currentTheme = await getCurrentTheme();
  const [memberList, categoryByMember] = await Promise.all([
    getAllMembers(),
    currentTheme
      ? getMemberCategoriesForTheme(currentTheme.name)
      : Promise.resolve(new Map<string, string>()),
  ]);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">メンバー管理</h1>
      <p className="text-xs text-neutral-400">
        LINEでログインするとここに自動で追加されます。招待は不要です。
        {currentTheme
          ? `部員の種類は${currentTheme.name}に本人が選択した内容です（ここからの編集はできません）。`
          : "部員の種類：まだ演舞テーマが作成されていません（演舞テーマ管理画面から作成できます）。"}
      </p>

      {/* スマホ: カード一覧 */}
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:hidden">
        {memberList.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-800">
                {m.displayName}
                {!m.lineUserId && (
                  <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                )}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    m.membershipStatus === "REGULAR"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {m.membershipStatus === "REGULAR" ? "正部員" : "体験"}
                </span>
              </p>
              <p className="text-[11px] text-neutral-400">
                {m.role === "ADMIN" ? "管理者" : "メンバー"} ・{" "}
                {m.isActive ? "有効" : "無効"}
                {m.attribute && ` ・ ${m.attribute}`}
                {m.email && ` ・ ${m.email}`}
                {categoryByMember.get(m.id) &&
                  ` ・ ${MEMBER_CATEGORY_LABELS[categoryByMember.get(m.id)!]}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <form action={`/api/admin/members/${m.id}`} method="POST">
                <input type="hidden" name="action" value="toggleRole" />
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-600"
                >
                  {m.role === "ADMIN" ? "一般にする" : "管理者にする"}
                </button>
              </form>
              <form action={`/api/admin/members/${m.id}`} method="POST">
                <input type="hidden" name="action" value="toggleActive" />
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] text-neutral-600"
                >
                  {m.isActive ? "無効化" : "有効化"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {/* PC: テーブル表示 */}
      <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
              <th className="px-4 py-2">氏名</th>
              <th className="px-4 py-2">会員区分</th>
              <th className="px-4 py-2">権限</th>
              <th className="px-4 py-2">状態</th>
              <th className="px-4 py-2">部員の属性</th>
              <th className="px-4 py-2">メール</th>
              <th className="px-4 py-2">部員の種類</th>
              <th className="px-4 py-2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {memberList.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 font-medium text-neutral-800">
                  {m.displayName}
                  {!m.lineUserId && (
                    <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      m.membershipStatus === "REGULAR"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {m.membershipStatus === "REGULAR" ? "正部員" : "体験"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-neutral-500">
                  {m.role === "ADMIN" ? "管理者" : "メンバー"}
                </td>
                <td className="px-4 py-2.5 text-neutral-500">{m.isActive ? "有効" : "無効"}</td>
                <td className="px-4 py-2.5 text-neutral-500">{m.attribute || "-"}</td>
                <td className="px-4 py-2.5 text-neutral-500">{m.email || "-"}</td>
                <td className="px-4 py-2.5 text-neutral-500">
                  {categoryByMember.get(m.id)
                    ? MEMBER_CATEGORY_LABELS[categoryByMember.get(m.id)!]
                    : "-"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <form action={`/api/admin/members/${m.id}`} method="POST">
                      <input type="hidden" name="action" value="toggleRole" />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-600"
                      >
                        {m.role === "ADMIN" ? "一般にする" : "管理者にする"}
                      </button>
                    </form>
                    <form action={`/api/admin/members/${m.id}`} method="POST">
                      <input type="hidden" name="action" value="toggleActive" />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-[11px] text-neutral-600"
                      >
                        {m.isActive ? "無効化" : "有効化"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
