import Link from "next/link";
import { notFound } from "next/navigation";
import { getCostumeLoanDetail, getLoanMemberOptions } from "@/lib/queries";
import { jstTodayKey } from "@/lib/calendar";
import { formatDateOnly, isLoanOverdue } from "@/lib/costumes";
import { formatDateTime } from "@/lib/labels";
import { formatFileSize } from "@/lib/notices";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { PhotoPicker } from "@/components/PhotoPicker";

export default async function CostumeLoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const [detail, memberOptions] = await Promise.all([getCostumeLoanDetail(id), getLoanMemberOptions()]);
  if (!detail) notFound();

  const { loan, costumeName, costumeSize, costumeTheme, lenderName, borrowerName, photos } = detail;
  const action = `/api/admin/costume-loans/${loan.id}`;
  const returned = !!loan.returnedAt;
  const overdue = isLoanOverdue(loan, jstTodayKey());

  // 貸し手・借り手がすでに無効化されているメンバーでも、現在の選択値が消えないよう選択肢に含める
  const optionIds = new Set(memberOptions.map((m) => m.id));
  const selectOptions = [
    ...memberOptions,
    ...(optionIds.has(loan.lenderId) ? [] : [{ id: loan.lenderId, displayName: `${lenderName}（無効）` }]),
    ...(optionIds.has(loan.borrowerId) || loan.borrowerId === loan.lenderId
      ? []
      : [{ id: loan.borrowerId, displayName: `${borrowerName}（無効）` }]),
  ];

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">貸し借りの詳細</h1>
        <Link href="/admin/costumes" className="text-xs font-semibold text-orange-700">
          ‹ 衣装管理へ戻る
        </Link>
      </div>

      <section className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-bold text-neutral-900">
            {costumeName}
            {costumeSize && (
              <span className="ml-1 text-xs font-normal text-neutral-400">（{costumeSize}）</span>
            )}
          </p>
          {costumeTheme && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              {costumeTheme}
            </span>
          )}
          {returned ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              返却済み（{formatDateTime(loan.returnedAt)}）
            </span>
          ) : overdue ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
              貸出中・返却予定日超過
            </span>
          ) : (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              貸出中
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-700">
          {lenderName} <span className="text-neutral-400">→</span> {borrowerName}
        </p>
        <p className="text-xs text-neutral-400">
          {formatDateOnly(loan.lentOn)} に貸出 ・ 返却予定 {loan.dueOn ? formatDateOnly(loan.dueOn) : "未設定"}
        </p>

        <form action={action} method="POST" className="pt-1">
          {returned ? (
            <>
              <input type="hidden" name="action" value="reopen" />
              <ConfirmSubmitButton
                message="貸出中に戻しますか？"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
              >
                貸出中に戻す（誤って返却済みにした場合）
              </ConfirmSubmitButton>
            </>
          ) : (
            <>
              <input type="hidden" name="action" value="return" />
              <ConfirmSubmitButton
                message={`${costumeName}（${borrowerName}さん）を返却済みにしますか？`}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                返却済みにする
              </ConfirmSubmitButton>
            </>
          )}
        </form>
      </section>

      {/* 写真 */}
      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">写真（{photos.length}枚）</h2>
        {photos.length === 0 ? (
          <p className="text-xs text-neutral-400">まだ写真がありません</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
              >
                <a
                  href={`/api/admin/costume-loan-photos/${photo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${photo.fileName}（${formatFileSize(photo.fileSize)}）`}
                >
                  <img
                    src={`/api/admin/costume-loan-photos/${photo.id}`}
                    alt={photo.fileName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </a>
                <form action={action} method="POST" className="absolute right-1 top-1">
                  <input type="hidden" name="action" value="deletePhoto" />
                  <input type="hidden" name="photoId" value={photo.id} />
                  <ConfirmSubmitButton
                    message="この写真を削除しますか？"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ✕
                  </ConfirmSubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={action} method="POST" encType="multipart/form-data" className="space-y-2">
          <input type="hidden" name="action" value="addPhotos" />
          <PhotoPicker />
          <button
            type="submit"
            className="w-full rounded-lg border border-neutral-300 py-2 text-sm font-semibold text-neutral-600"
          >
            写真を追加
          </button>
        </form>
      </section>

      {/* 記録の編集 */}
      <form
        action={action}
        method="POST"
        className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
      >
        <input type="hidden" name="action" value="update" />
        <h2 className="text-sm font-semibold text-neutral-700">記録を編集</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-600">貸し手</label>
            <select
              name="lenderId"
              required
              defaultValue={loan.lenderId}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {selectOptions.map((m) => (
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
              defaultValue={loan.borrowerId}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {selectOptions.map((m) => (
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
              defaultValue={loan.lentOn}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-neutral-600">返却予定日</label>
            <input
              type="date"
              name="dueOn"
              defaultValue={loan.dueOn ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-neutral-600">メモ</label>
          <textarea
            name="note"
            rows={3}
            defaultValue={loan.note ?? ""}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white"
        >
          更新する
        </button>
      </form>

      <form action={action} method="POST">
        <input type="hidden" name="action" value="delete" />
        <ConfirmSubmitButton
          message="この貸し借りの記録を削除しますか？写真も削除され、元に戻せません。"
          className="w-full rounded-lg border border-red-200 py-2 text-sm font-semibold text-red-600"
        >
          この記録を削除する
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
