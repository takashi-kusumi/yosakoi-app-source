import { getCurrentTheme, getAllThemes, getPendingCategoryMembers } from "@/lib/queries";
import { MEMBER_CATEGORY_LABELS } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { RenameDeleteActions } from "@/components/RenameDeleteActions";

export default async function AdminThemePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const [currentTheme, themes] = await Promise.all([getCurrentTheme(), getAllThemes()]);
  const pending = currentTheme ? await getPendingCategoryMembers(currentTheme.name) : [];
  const carryableCount = pending.filter((p) => p.previousCategory).length;

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div>
        <h1 className="text-lg font-bold text-neutral-900">演舞テーマ管理</h1>
        <p className="mt-1 text-xs text-neutral-400">
          ここで切り替える「現在の演舞テーマ」（例: ギャルマインド、ワンスピ）に、年会費管理と
          部員の種類（本人の登録内容）が連動します。暦年ではなく、その代の演舞テーマ単位で管理します。
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-neutral-600">現在の演舞テーマ</p>
        <p className="mt-1 text-xl font-bold text-orange-700">
          {currentTheme ? currentTheme.name : "未設定"}
        </p>
        {!currentTheme && (
          <p className="mt-1 text-xs text-neutral-400">
            まだ演舞テーマが作成されていません。下のフォームから最初のテーマを作成してください。
          </p>
        )}
      </section>

      <form
        action="/api/admin/theme"
        method="POST"
        className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="action" value="switch" />
        <label className="block text-xs font-semibold text-neutral-600">
          新しい演舞テーマに切り替える
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="name"
            required
            placeholder="例: ワンスピ"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            切り替える
          </button>
        </div>
        <p className="text-[11px] text-neutral-400">
          切り替えると、以後の年会費管理・部員の種類の登録はこのテーマが対象になります（過去のテーマの記録は消えません）。
        </p>
      </form>

      {currentTheme && (
        <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-700">
              「{currentTheme.name}」の部員の種類が未登録のメンバー（{pending.length}名）
            </p>
            {carryableCount > 0 && (
              <form action="/api/admin/theme" method="POST">
                <input type="hidden" name="action" value="bulkCarryForward" />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-700"
                >
                  引き継げる{carryableCount}名をまとめて引き継ぐ
                </button>
              </form>
            )}
          </div>

          {pending.length === 0 ? (
            <p className="text-xs text-neutral-400">
              全員、今のテーマの部員の種類を登録済みです。
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {pending.map(({ member: m, previousCategory }) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-700">{m.displayName}</p>
                    <p className="text-[11px] text-neutral-400">
                      前回:{" "}
                      {previousCategory ? MEMBER_CATEGORY_LABELS[previousCategory] : "記録なし"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <form action="/api/admin/theme" method="POST">
                      <input type="hidden" name="action" value="carryForward" />
                      <input type="hidden" name="memberId" value={m.id} />
                      <button
                        type="submit"
                        disabled={!previousCategory}
                        className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 disabled:opacity-40"
                      >
                        更新なし（引き継ぐ）
                      </button>
                    </form>
                    <form action="/api/admin/theme" method="POST">
                      <input type="hidden" name="action" value="dismiss" />
                      <input type="hidden" name="displayName" value={m.displayName} />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600"
                      >
                        更新あり（選び直す）
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {themes.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-neutral-600">これまでの演舞テーマ</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {themes.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                  t.isCurrent
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-neutral-200 text-neutral-500"
                }`}
              >
                <span>{t.name}</span>
                <RenameDeleteActions
                  actionPath="/api/admin/theme"
                  idFieldName="themeId"
                  id={t.id}
                  name={t.name}
                  deleteConfirmMessage={`「${t.name}」を削除しますか？演舞テーマの一覧から消えますが、このテーマ名で記録済みの年会費・部員の種類のデータは残ります。`}
                  deleteDisabledReason={
                    t.isCurrent ? "現在のテーマは削除できません（先に切り替えてください）" : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
