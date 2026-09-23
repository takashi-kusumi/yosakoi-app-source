import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventWithResponses } from "@/lib/queries";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { GuestActions } from "@/components/GuestActions";

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const detail = await getEventWithResponses(id);
  if (!detail) notFound();

  const unansweredWithLine = detail.unanswered.filter((m) => m.lineUserId).length;
  const answeredMembers = detail.answered.filter((a) => !a.member.isGuest);
  const answeredWithLine = answeredMembers.filter((a) => a.member.lineUserId).length;
  const guestAnswered = detail.answered.filter((a) => a.member.isGuest);
  // 参加費を支払済みのまま「不参加」に回答を変更した人（キャンセル）。
  // feePaidは意図的にリセットしていない（支払い記録は残す方針）ため、
  // 返金・精算などの対応が必要かどうかを運営側で確認できるようにここで検出する。
  const needsFeeReview = detail.answered.filter(
    (a) => a.response.status !== "ATTENDING" && a.response.feePaid
  );

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div>
        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          {EVENT_TYPE_LABELS[detail.event.type] ?? detail.event.type}
        </span>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">{detail.event.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{formatDateTime(detail.event.eventDate)}</p>
        {detail.event.location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <span aria-hidden>📍</span>
            {detail.event.location}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${detail.event.id}/edit`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            編集する
          </Link>
          <Link
            href={`/admin/events/new?from=${detail.event.id}`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            複製して新規作成
          </Link>
          <a
            href={`/api/admin/events/${detail.event.id}/export`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            CSVダウンロード
          </a>
          <form action={`/api/admin/events/${detail.event.id}`} method="POST" className="inline-block">
            <input type="hidden" name="action" value={detail.event.isOpen ? "close" : "reopen"} />
            <input type="hidden" name="redirectTo" value={`/admin/events/${detail.event.id}`} />
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
            >
              {detail.event.isOpen ? "回答受付を締め切る" : "受付を再開する"}
            </button>
          </form>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">LINEでリマインド送信</h2>
        <p className="text-xs text-neutral-400">
          未回答: {detail.unanswered.length}名（LINE連携済み {unansweredWithLine}名） / 回答済み:{" "}
          {answeredMembers.length}名（LINE連携済み {answeredWithLine}名）
          {guestAnswered.length > 0 && ` / 体験参加 ${guestAnswered.length}名`}
        </p>
        <form action="/api/admin/remind" method="POST" className="space-y-3">
          <input type="hidden" name="eventId" value={detail.event.id} />
          <textarea
            name="message"
            rows={3}
            placeholder="空欄の場合は定型メッセージを送信します"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              name="target"
              value="unanswered"
              className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
              disabled={unansweredWithLine === 0}
            >
              未回答者に送信
            </button>
            <button
              type="submit"
              name="target"
              value="answered"
              className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-semibold text-neutral-600 disabled:opacity-40"
              disabled={answeredWithLine === 0}
            >
              回答済みに送信
            </button>
          </div>
        </form>
      </section>

      {needsFeeReview.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          <p className="font-semibold">
            ⚠ 参加費支払済みのまま不参加になっている人が{needsFeeReview.length}名います
          </p>
          <p className="mt-1 text-xs">
            返金するか、支払済みのまま記録を残すかは運営側でご確認ください（下の一覧で
            「支払済み・不参加」と表示されています）。
          </p>
          <ul className="mt-2 space-y-0.5 text-xs">
            {needsFeeReview.map(({ member: m }) => (
              <li key={m.id}>・{m.displayName}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          回答状況（{answeredMembers.length}/{answeredMembers.length + detail.unanswered.length}）
          {detail.event.feeAmount != null && ` ・ 参加費 ${detail.event.feeAmount}円`}
        </p>
        {/* スマホ: カード一覧 */}
        <ul className="space-y-1 text-sm md:hidden">
          {detail.answered.map(({ member: m, response }) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-1.5 last:border-0"
            >
              <span className="min-w-0 text-neutral-700">
                {m.displayName}
                {m.isGuest && (
                  <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                    体験
                  </span>
                )}
                {!m.lineUserId && !m.isGuest && (
                  <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    response.status === "ATTENDING" ? "text-orange-600" : "text-neutral-400"
                  }
                >
                  {response.status === "ATTENDING" ? "参加" : "不参加"}
                </span>
                {detail.event.feeAmount != null &&
                  (response.status === "ATTENDING" || response.feePaid) && (
                    <form action={`/api/admin/events/${detail.event.id}`} method="POST">
                      <input type="hidden" name="action" value="toggleFeePaid" />
                      <input type="hidden" name="memberId" value={m.id} />
                      <button
                        type="submit"
                        title={
                          response.status !== "ATTENDING"
                            ? "不参加に変更後も参加費は支払済みのままです。返金・精算が済んだらクリックして解除してください。"
                            : undefined
                        }
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          response.status !== "ATTENDING"
                            ? "bg-amber-50 text-amber-700"
                            : response.feePaid
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {response.status !== "ATTENDING"
                          ? "支払済み・不参加（要確認）"
                          : response.feePaid
                            ? "参加費 支払済み"
                            : "参加費 未払い"}
                      </button>
                    </form>
                  )}
                {m.isGuest && (
                  <GuestActions
                    eventId={detail.event.id}
                    memberId={m.id}
                    displayName={m.displayName}
                    status={response.status}
                  />
                )}
              </span>
            </li>
          ))}
          {detail.unanswered.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0"
            >
              <span className="text-neutral-400">
                {m.displayName}
                {!m.lineUserId && (
                  <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                )}
              </span>
              <span className="text-yellow-600">未回答</span>
            </li>
          ))}
        </ul>

        {/* PC: テーブル表示 */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-500">
                <th className="py-2 pr-3">氏名</th>
                <th className="py-2 pr-3">回答</th>
                <th className="py-2 pr-3">参加費</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {detail.answered.map(({ member: m, response }) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3 text-neutral-700">
                    {m.displayName}
                    {m.isGuest && (
                      <span className="ml-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                        体験
                      </span>
                    )}
                    {!m.lineUserId && !m.isGuest && (
                      <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                    )}
                  </td>
                  <td
                    className={`py-2 pr-3 font-medium ${
                      response.status === "ATTENDING" ? "text-orange-600" : "text-neutral-400"
                    }`}
                  >
                    {response.status === "ATTENDING" ? "参加" : "不参加"}
                  </td>
                  <td className="py-2 pr-3">
                    {detail.event.feeAmount != null &&
                    (response.status === "ATTENDING" || response.feePaid) ? (
                      <form action={`/api/admin/events/${detail.event.id}`} method="POST">
                        <input type="hidden" name="action" value="toggleFeePaid" />
                        <input type="hidden" name="memberId" value={m.id} />
                        <button
                          type="submit"
                          title={
                            response.status !== "ATTENDING"
                              ? "不参加に変更後も参加費は支払済みのままです。返金・精算が済んだらクリックして解除してください。"
                              : undefined
                          }
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            response.status !== "ATTENDING"
                              ? "bg-amber-50 text-amber-700"
                              : response.feePaid
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-600"
                          }`}
                        >
                          {response.status !== "ATTENDING"
                            ? "支払済み・不参加（要確認）"
                            : response.feePaid
                              ? "支払済み"
                              : "未払い"}
                        </button>
                      </form>
                    ) : (
                      <span className="text-neutral-300">-</span>
                    )}
                  </td>
                  <td className="py-2">
                    {m.isGuest ? (
                      <GuestActions
                        eventId={detail.event.id}
                        memberId={m.id}
                        displayName={m.displayName}
                        status={response.status}
                      />
                    ) : (
                      <span className="text-neutral-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {detail.unanswered.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-3 text-neutral-400">
                    {m.displayName}
                    {!m.lineUserId && (
                      <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-yellow-600">未回答</td>
                  <td className="py-2 pr-3 text-neutral-300">-</td>
                  <td className="py-2 text-neutral-300">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
