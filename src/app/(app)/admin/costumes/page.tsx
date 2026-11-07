import Link from "next/link";
import {
  getAllThemes,
  getCostumeLedger,
  getCostumeLoans,
  getCurrentTheme,
  getLoanMemberOptions,
} from "@/lib/queries";
import { jstTodayKey } from "@/lib/calendar";
import { formatDateOnly, isLoanOverdue } from "@/lib/costumes";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function AdminCostumesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  const [ledger, loans, memberOptions, themes, currentTheme] = await Promise.all([
    getCostumeLedger(),
    getCostumeLoans(),
    getLoanMemberOptions(),
    getAllThemes(),
    getCurrentTheme(),
  ]);
  const today = jstTodayKey();
  const activeLoans = loans.filter((l) => !l.loan.returnedAt);
  const returnedLoans = loans.filter((l) => l.loan.returnedAt);
  const overdueCount = activeLoans.filter((l) => isLoanOverdue(l.loan, today)).length;

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">衣装管理</h1>
        <Link
          href="/admin/costumes/loans/new"
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ＋ 貸し借りを記録
        </Link>
      </div>
      <p className="text-xs text-neutral-400">
        衣装の台帳と、メンバー間の貸し借り（誰が誰にどの衣装を貸していて、いつ返す予定か）を管理者が記録します。
      </p>

      {/* 貸出中 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-700">
          貸出中（{activeLoans.length}件
          {overdueCount > 0 && (
            <span className="text-red-600"> ・ 返却予定日超過 {overdueCount}件</span>
          )}
          ）
        </h2>
        {activeLoans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            現在貸出中の衣装はありません
          </p>
        ) : (
          <ul className="space-y-2">
            {activeLoans.map(({ loan, costumeName, costumeSize, lenderName, borrowerName, photoCount }) => {
              const overdue = isLoanOverdue(loan, today);
              return (
                <li
                  key={loan.id}
                  className={`rounded-xl border bg-white px-4 py-3 shadow-sm ${
                    overdue ? "border-red-200" : "border-neutral-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-neutral-900">
                      {costumeName}
                      {costumeSize && (
                        <span className="ml-1 text-xs font-normal text-neutral-400">
                          （{costumeSize}）
                        </span>
                      )}
                    </p>
                    {overdue && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                        返却予定日超過
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {lenderName} <span className="text-neutral-400">→</span> {borrowerName}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatDateOnly(loan.lentOn)} に貸出 ・ 返却予定{" "}
                    {loan.dueOn ? formatDateOnly(loan.dueOn) : "未設定"}
                    {photoCount > 0 && ` ・ 写真${photoCount}枚`}
                  </p>
                  {loan.note && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-500">{loan.note}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <form action={`/api/admin/costume-loans/${loan.id}`} method="POST">
                      <input type="hidden" name="action" value="return" />
                      <input type="hidden" name="redirectTo" value="/admin/costumes" />
                      <ConfirmSubmitButton
                        message={`${costumeName}（${borrowerName}さん）を返却済みにしますか？`}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        返却済みにする
                      </ConfirmSubmitButton>
                    </form>
                    <Link
                      href={`/admin/costumes/loans/${loan.id}`}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                    >
                      詳細・写真・編集
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 衣装台帳 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">衣装台帳（{ledger.length}点）</h2>

        <form
          action="/api/admin/costumes"
          method="POST"
          className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="action" value="create" />
          <p className="text-xs font-semibold text-neutral-600">衣装を台帳に追加</p>
          <input
            type="text"
            name="name"
            required
            placeholder="衣装名（例: 法被（赤））"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              name="theme"
              list="costume-theme-options"
              defaultValue={currentTheme?.name ?? ""}
              placeholder="演舞テーマ（任意）"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              name="size"
              placeholder="サイズ（任意）"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <select
            name="ownerId"
            defaultValue=""
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">持ち主: 部の共用（個人の持ち物ではない）</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                持ち主: {m.displayName}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="note"
            placeholder="メモ（任意）"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white"
          >
            追加する
          </button>
        </form>
        <datalist id="costume-theme-options">
          {themes.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>

        {ledger.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            まだ衣装が登録されていません。まず上のフォームから台帳に追加してください
          </p>
        ) : (
          <ul className="space-y-2">
            {ledger.map(({ costume, ownerName, activeLoans: onLoan }) => (
              <li
                key={costume.id}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-neutral-900">{costume.name}</p>
                  {costume.theme && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      {costume.theme}
                    </span>
                  )}
                  {costume.size && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                      {costume.size}
                    </span>
                  )}
                  {onLoan.length > 0 ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      貸出中（{onLoan.map((l) => l.borrowerName).join("・")}さん）
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      手元にある
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">
                  持ち主: {ownerName ?? "部の共用"}
                  {costume.note && ` ・ ${costume.note}`}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {onLoan.length === 0 && (
                    <Link
                      href={`/admin/costumes/loans/new?costumeId=${costume.id}`}
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      この衣装を貸し出す
                    </Link>
                  )}
                  <details className="w-full">
                    <summary className="cursor-pointer text-xs font-semibold text-neutral-500">
                      編集・削除
                    </summary>
                    <div className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                      <form action="/api/admin/costumes" method="POST" className="space-y-2">
                        <input type="hidden" name="action" value="update" />
                        <input type="hidden" name="costumeId" value={costume.id} />
                        <input
                          type="text"
                          name="name"
                          required
                          defaultValue={costume.name}
                          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            name="theme"
                            list="costume-theme-options"
                            defaultValue={costume.theme ?? ""}
                            placeholder="演舞テーマ"
                            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          />
                          <input
                            type="text"
                            name="size"
                            defaultValue={costume.size ?? ""}
                            placeholder="サイズ"
                            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          />
                        </div>
                        <select
                          name="ownerId"
                          defaultValue={costume.ownerId ?? ""}
                          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        >
                          <option value="">持ち主: 部の共用</option>
                          {memberOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                              持ち主: {m.displayName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          name="note"
                          defaultValue={costume.note ?? ""}
                          placeholder="メモ"
                          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        />
                        <button
                          type="submit"
                          className="w-full rounded bg-orange-600 py-1.5 text-xs font-semibold text-white"
                        >
                          保存
                        </button>
                      </form>
                      <form action="/api/admin/costumes" method="POST">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="costumeId" value={costume.id} />
                        <ConfirmSubmitButton
                          message={`「${costume.name}」を台帳から削除しますか？この衣装の貸し借りの記録（写真を含む）もすべて削除されます。`}
                          className="w-full rounded border border-red-200 py-1.5 text-xs font-semibold text-red-600"
                        >
                          台帳から削除する
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 返却済みの履歴 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-700">返却済みの履歴（{returnedLoans.length}件）</h2>
        {returnedLoans.length === 0 ? (
          <p className="text-xs text-neutral-400">まだ返却済みの記録はありません</p>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {returnedLoans.map(({ loan, costumeName, lenderName, borrowerName, photoCount }) => (
              <li key={loan.id}>
                <Link
                  href={`/admin/costumes/loans/${loan.id}`}
                  className="block px-4 py-3 hover:bg-neutral-50"
                >
                  <p className="text-sm font-medium text-neutral-800">{costumeName}</p>
                  <p className="text-xs text-neutral-500">
                    {lenderName} → {borrowerName} ・ {formatDateOnly(loan.lentOn)} 〜{" "}
                    {formatDateOnly(
                      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
                        loan.returnedAt!
                      )
                    )}
                    {photoCount > 0 && ` ・ 写真${photoCount}枚`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
