import Link from "next/link";
import { getEventsWithCounts } from "@/lib/queries";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  VALID_EVENT_TYPES,
  formatDateTime,
} from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; type?: string }>;
}) {
  const { ok, error, type } = await searchParams;
  const allRows = await getEventsWithCounts();
  const typeFilter = VALID_EVENT_TYPES.includes(type as (typeof VALID_EVENT_TYPES)[number])
    ? (type as (typeof VALID_EVENT_TYPES)[number])
    : undefined;
  const rows = typeFilter ? allRows.filter((r) => r.event.type === typeFilter) : allRows;

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">管理者メニュー</h1>
        <Link
          href="/admin/events/new"
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ＋ イベント作成
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Link
          href="/admin/members"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">メンバー管理</p>
          <p className="mt-1 text-xs text-neutral-400">権限・有効/無効の管理</p>
        </Link>
        <Link
          href="/admin/tools"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">道具マスタ管理</p>
          <p className="mt-1 text-xs text-neutral-400">道具の項目・保有状況一覧</p>
        </Link>
        <Link
          href="/admin/notices"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">お知らせ管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            集合場所の連絡・しおりの共有などのお知らせを作成・編集
          </p>
        </Link>
        <Link
          href="/admin/surveys"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">アンケート管理</p>
          <p className="mt-1 text-xs text-neutral-400">自由記述・選択式のアンケートを作成・集計</p>
        </Link>
        <Link
          href="/admin/groups"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">グループ管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            パートなどのグループを登録し、アンケートの対象者を絞り込めるようにする
          </p>
        </Link>
        <Link
          href="/admin/theme"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">演舞テーマ管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            現在の演舞テーマを切り替える（年会費・部員の種類が連動）
          </p>
        </Link>
        <Link
          href="/admin/fees"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <p className="font-semibold text-neutral-800">年会費管理</p>
          <p className="mt-1 text-xs text-neutral-400">
            正部員の年会費の支払い状況を演舞テーマごとに記録・確認する
          </p>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">イベント一覧</h2>
        <div className="flex gap-2 overflow-x-auto pb-0.5 text-xs">
          <Link
            href="/admin"
            className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
              !typeFilter
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            すべて
          </Link>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/admin?type=${opt.value}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
                typeFilter === opt.value
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-500"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            {typeFilter ? "該当するイベントがありません" : "まだイベントがありません"}
          </p>
        )}
        <ul className="space-y-2">
          {rows.map(({ event, counts, activeMemberCount }) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                    {EVENT_TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  {!event.isOpen && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                      締切
                    </span>
                  )}
                </div>
                <p className="font-semibold text-neutral-900">{event.title}</p>
                <p className="text-xs text-neutral-500">{formatDateTime(event.eventDate)}</p>
                {event.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                    <span aria-hidden>📍</span>
                    {event.location}
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-500">
                  参加 {counts.attending} ・ 不参加 {counts.notAttending} ・ 未回答{" "}
                  {activeMemberCount - counts.total}
                  {counts.guestAttending > 0 && ` ・ 体験参加 ${counts.guestAttending}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
