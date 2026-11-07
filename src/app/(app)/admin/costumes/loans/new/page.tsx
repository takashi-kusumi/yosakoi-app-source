import Link from "next/link";
import { getCostumeLedger, getLoanMemberOptions } from "@/lib/queries";
import { jstTodayKey } from "@/lib/calendar";
import { FlashMessage } from "@/components/FlashMessage";
import { PhotoPicker } from "@/components/PhotoPicker";

export default async function NewCostumeLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; costumeId?: string }>;
}) {
  const { ok, error, costumeId } = await searchParams;
  const [ledger, memberOptions] = await Promise.all([getCostumeLedger(), getLoanMemberOptions()]);

  const selected = ledger.find((r) => r.costume.id === costumeId);
  // 持ち主が決まっている衣装は、貸し手の初期値を持ち主にしておく（変更可能）
  const defaultLenderId = selected?.costume.ownerId ?? "";

  if (ledger.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-neutral-900">貸し借りを記録</h1>
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          まだ衣装が台帳に登録されていません。先に衣装を登録してください。
        </p>
        <Link
          href="/admin/costumes"
          className="inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
        >
          衣装管理を開く
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">貸し借りを記録</h1>
        <Link href="/admin/costumes" className="text-xs font-semibold text-orange-700">
          ‹ 衣装管理へ戻る
        </Link>
      </div>

      <form
        action="/api/admin/costume-loans"
        method="POST"
        encType="multipart/form-data"
        className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-600">衣装</label>
          <select
            name="costumeId"
            required
            defaultValue={selected && selected.activeLoans.length === 0 ? selected.costume.id : ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              衣装を選択
            </option>
            {ledger.map(({ costume, activeLoans }) => (
              <option key={costume.id} value={costume.id} disabled={activeLoans.length > 0}>
                {costume.name}
                {costume.size ? `（${costume.size}）` : ""}
                {costume.theme ? ` / ${costume.theme}` : ""}
                {activeLoans.length > 0 ? " ※貸出中" : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-neutral-400">
            貸出中の衣装は選べません。先に返却を記録してください。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-600">貸し手</label>
            <select
              name="lenderId"
              required
              defaultValue={defaultLenderId}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                選択
              </option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-600">借り手</label>
            <select
              name="borrowerId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="" disabled>
                選択
              </option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-600">貸した日</label>
            <input
              type="date"
              name="lentOn"
              required
              defaultValue={jstTodayKey()}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-600">返却予定日（任意）</label>
            <input
              type="date"
              name="dueOn"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-600">メモ（任意）</label>
          <textarea
            name="note"
            rows={3}
            placeholder="サイズ感、汚れ・破損の状態、受け渡し方法など"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-600">
            写真（任意・貸出時の状態など）
          </label>
          <PhotoPicker />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white"
        >
          記録する
        </button>
      </form>
    </div>
  );
}
