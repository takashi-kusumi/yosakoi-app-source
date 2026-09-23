import Link from "next/link";
import {
  getMembershipFeeStatus,
  getMembershipFeeThemes,
  getAllThemes,
  getCurrentTheme,
  getMemberCategoriesForTheme,
} from "@/lib/queries";
import { formatDateTime, MEMBER_CATEGORY_LABELS, MEMBER_CATEGORY_OPTIONS } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; theme?: string }>;
}) {
  const { ok, error, theme: themeParam } = await searchParams;

  const [themes, knownThemes, currentTheme] = await Promise.all([
    getAllThemes(),
    getMembershipFeeThemes(),
    getCurrentTheme(),
  ]);
  // テーマの一覧タブは「演舞テーマ管理」で作成したテーマが基本だが、念のため既存の
  // 年会費レコードにしか無いテーマも落とさないように合わせて出す。
  const allThemeNames = Array.from(
    new Set([...themes.map((t) => t.name), ...knownThemes])
  ).sort((a, b) => b.localeCompare(a));
  const theme =
    themeParam && allThemeNames.includes(themeParam) ? themeParam : currentTheme?.name ?? allThemeNames[0];

  if (!theme) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-neutral-900">年会費管理</h1>
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          まだ演舞テーマが作成されていません。先に「演舞テーマ管理」画面でテーマを作成してください。
        </p>
        <Link
          href="/admin/theme"
          className="inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
        >
          演舞テーマ管理を開く
        </Link>
      </div>
    );
  }

  const [rows, categoryByMember] = await Promise.all([
    getMembershipFeeStatus(theme),
    getMemberCategoriesForTheme(theme),
  ]);

  const unpaidCount = rows.filter((r) => !r.fee?.paid).length;

  // 未作成（レコードが無い）人を、部員の種類ごとにグループ化する（一括作成用）
  const pendingByCategory = new Map<string, { label: string; count: number }>();
  for (const { member, fee } of rows) {
    if (fee) continue;
    const category = categoryByMember.get(member.id) ?? null;
    const key = category ?? "UNSET";
    const label = category ? MEMBER_CATEGORY_LABELS[category] : "未設定（部員の種類が未登録）";
    const entry = pendingByCategory.get(key) ?? { label, count: 0 };
    entry.count += 1;
    pendingByCategory.set(key, entry);
  }

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">年会費管理</h1>
        <Link href="/admin/theme" className="text-xs font-semibold text-orange-700">
          演舞テーマ管理 ›
        </Link>
      </div>
      <p className="text-xs text-neutral-400">
        正部員（体験登録中を除く）を対象に、演舞テーマごとの年会費の支払い状況を記録します。
        テーマの切替は「演舞テーマ管理」画面で行います。
      </p>

      <div className="flex flex-wrap gap-2 text-xs">
        {allThemeNames.map((t) => (
          <Link
            key={t}
            href={`/admin/fees?theme=${t}`}
            className={`rounded-full border px-3 py-1.5 font-semibold ${
              t === theme
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            {t}
            {t === currentTheme?.name && "（現在）"}
          </Link>
        ))}
      </div>

      {pendingByCategory.size > 0 && (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-neutral-600">
            {theme}のレコードが未作成の正部員に、部員の種類ごとに金額を指定して一括作成する
          </p>
          <ul className="space-y-2">
            {[...pendingByCategory.entries()].map(([key, { label, count }]) => (
              <li key={key}>
                <form
                  action="/api/admin/fees"
                  method="POST"
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="action" value="bulkCreateByCategory" />
                  <input type="hidden" name="theme" value={theme} />
                  <input type="hidden" name="category" value={key} />
                  <span className="min-w-0 flex-1 text-xs text-neutral-600">
                    {label}（{count}名）
                  </span>
                  <input
                    type="number"
                    name="amount"
                    required
                    min={0}
                    placeholder="金額（円）"
                    className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    この属性に一括作成
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-neutral-400">
            部員の種類は本人が /register で選択したものです（
            {MEMBER_CATEGORY_OPTIONS.map((o) => o.label).join(" / ")} ）。
          </p>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        {theme}: 対象 {rows.length}名 ・ 未払い {unpaidCount}名
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          対象となる正部員がいません
        </p>
      ) : (
        <>
          {/* スマホ: カード一覧 */}
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:hidden">
            {rows.map(({ member, fee }) => (
              <li key={member.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-800">
                    {member.displayName}
                    {categoryByMember.get(member.id) && (
                      <span className="ml-1.5 text-[11px] font-normal text-neutral-400">
                        （{MEMBER_CATEGORY_LABELS[categoryByMember.get(member.id)!]}）
                      </span>
                    )}
                  </p>
                  {fee?.paid && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      支払済み{fee.paidAt ? `（${formatDateTime(fee.paidAt)}）` : ""}
                    </span>
                  )}
                </div>
                <form
                  action="/api/admin/fees"
                  method="POST"
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="action" value="upsert" />
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="theme" value={theme} />
                  <input
                    type="number"
                    name="amount"
                    min={0}
                    defaultValue={fee?.amount ?? ""}
                    placeholder="金額（円）"
                    className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                    <input
                      type="checkbox"
                      name="paid"
                      value="true"
                      defaultChecked={fee?.paid ?? false}
                      className="h-4 w-4"
                    />
                    支払済み
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                  >
                    保存
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {/* PC: テーブル表示 */}
          <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                  <th className="px-4 py-2">氏名</th>
                  <th className="px-4 py-2">部員の種類</th>
                  <th className="px-4 py-2">支払状況</th>
                  <th className="px-4 py-2">金額・操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map(({ member, fee }) => (
                  <tr key={member.id}>
                    <td className="px-4 py-2.5 font-medium text-neutral-800">
                      {member.displayName}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {categoryByMember.get(member.id)
                        ? MEMBER_CATEGORY_LABELS[categoryByMember.get(member.id)!]
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      {fee?.paid ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          支払済み{fee.paidAt ? `（${formatDateTime(fee.paidAt)}）` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">未払い</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <form
                        action="/api/admin/fees"
                        method="POST"
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="action" value="upsert" />
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="theme" value={theme} />
                        <input
                          type="number"
                          name="amount"
                          min={0}
                          defaultValue={fee?.amount ?? ""}
                          placeholder="金額（円）"
                          className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                        />
                        <label className="flex items-center gap-1 text-xs text-neutral-600">
                          <input
                            type="checkbox"
                            name="paid"
                            value="true"
                            defaultChecked={fee?.paid ?? false}
                            className="h-4 w-4"
                          />
                          支払済み
                        </label>
                        <button
                          type="submit"
                          className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-600"
                        >
                          保存
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
