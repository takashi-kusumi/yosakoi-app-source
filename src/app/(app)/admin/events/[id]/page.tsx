import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getEventWithResponses, getLastMinuteChanges, getEventComments } from "@/lib/queries";
import { formatEventDate, isEventOpen, formatDateTime, STATUS_SHORT } from "@/lib/labels";
import { LastMinuteChanges } from "@/components/LastMinuteChanges";
import { ProxyRespondForm } from "@/components/ProxyRespondForm";
import { EventComments } from "@/components/EventComments";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TypeChip } from "@/components/EventCard";
import { AttendanceList } from "@/components/AttendanceList";
import { ShareTextCard } from "@/components/ShareTextCard";
import { eventShareTemplates } from "@/lib/shareText";
import { getAppUrl } from "@/lib/serverAppUrl";

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const me = await getCurrentMember();
  if (!me) return null;

  const detail = await getEventWithResponses(id);
  if (!detail) notFound();
  const { event } = detail;
  const open = isEventOpen(event);
  const [lastMinute, comments] = await Promise.all([getLastMinuteChanges(event), getEventComments(event.id)]);
  const lastMinuteIds = new Set(lastMinute.map((c) => c.change.memberId));
  const proxyOptions = [
    ...detail.unanswered.map((m) => ({ id: m.id, displayName: m.displayName, currentLabel: null })),
    ...detail.answered
      .filter((a) => !a.member.isGuest)
      .map((a) => ({ id: a.member.id, displayName: a.member.displayName, currentLabel: STATUS_SHORT[a.response.status] })),
  ];
  const selfPath = `/admin/events/${event.id}`;
  const action = `/api/admin/events/${event.id}`;

  const feeTargets = detail.answered.filter(
    (a) => a.response.status === "ATTENDING" || a.response.feePaid
  );
  const paidCount = feeTargets.filter((a) => a.response.feePaid && a.response.status === "ATTENDING").length;
  const attendingCount = detail.answered.filter((a) => a.response.status === "ATTENDING").length;

  const shareTemplates = eventShareTemplates(event, {
    appUrl: await getAppUrl(),
    unansweredNames: detail.unanswered.map((m) => m.displayName),
    attendingNames: detail.answered.filter((a) => a.response.status === "ATTENDING").map((a) => a.member.displayName),
  });

  const btn = "rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-center text-xs font-bold text-neutral-700 shadow-sm";

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <Link href="/admin" className="text-sm font-semibold text-neutral-500">
        ‹ 管理
      </Link>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeChip type={event.type} />
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              open ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {open ? "受付中" : event.isOpen ? "締切済み" : "受付終了"}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{event.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">🗓 {formatEventDate(event.eventDate, event.endDate)}</p>
        {event.location && <p className="text-sm text-neutral-600">📍 {event.location}</p>}
        {event.responseDeadline && (
          <p className="text-sm text-neutral-600">⏰ 回答締切 {formatDateTime(event.responseDeadline)}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/admin/events/${event.id}/edit`} className={btn}>
            編集する
          </Link>
          <Link href={`/admin/events/new?from=${event.id}`} className={btn}>
            複製して作成
          </Link>
          <form action={action} method="POST">
            <input type="hidden" name="action" value={event.isOpen ? "close" : "reopen"} />
            <input type="hidden" name="redirectTo" value={selfPath} />
            <button type="submit" className={`${btn} w-full`}>
              {event.isOpen ? "受付を締め切る" : "受付を再開する"}
            </button>
          </form>
          <a href={`/api/admin/events/${event.id}/export`} className={btn}>
            CSVダウンロード
          </a>
          <Link href={`/events/${event.id}`} className={`${btn} col-span-2`}>
            メンバー画面で見る（写真の追加はこちら）
          </Link>
        </div>
      </section>

      <LastMinuteChanges changes={lastMinute} />

      <ShareTextCard
        description="「告知」「リマインド（未回答者の名前入り）」「参加者への案内」から選べます。"
        templates={shareTemplates}
      />

      {event.feeAmount != null && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800">
            参加費 {event.feeAmount.toLocaleString()}円
            <span className="ml-2 text-xs font-semibold text-neutral-400">
              支払済み {paidCount} / 参加 {attendingCount}
            </span>
          </h2>
          <p className="mt-1 text-[11px] text-neutral-400">タップで支払済み／未払いを切り替えます。</p>
          {feeTargets.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">まだ参加者がいません</p>
          ) : (
            <ul className="mt-2 divide-y divide-neutral-100">
              {feeTargets.map(({ member: m, response }) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate text-sm text-neutral-800">
                    {m.displayName}
                    {m.isGuest && <span className="ml-1 text-[11px] text-violet-600">（体験）</span>}
                  </span>
                  <form action={action} method="POST">
                    <input type="hidden" name="action" value="toggleFeePaid" />
                    <input type="hidden" name="memberId" value={m.id} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        response.status !== "ATTENDING"
                          ? "bg-amber-50 text-amber-700"
                          : response.feePaid
                            ? "bg-emerald-50 text-emerald-700"
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
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-800">参加状況</h2>
        <AttendanceList
          eventId={event.id}
          answered={detail.answered}
          unanswered={detail.unanswered}
          nameById={detail.nameById}
          viewer={{ id: me.id, isAdmin: true }}
          redirectTo={selfPath}
          lastMinuteIds={lastMinuteIds}
        />
      </section>

      <ProxyRespondForm action={action} options={proxyOptions} />

      <EventComments eventId={event.id} comments={comments} viewer={{ id: me.id, isAdmin: true }} redirectTo={selfPath} />

      <form action={action} method="POST">
        <input type="hidden" name="action" value="delete" />
        <ConfirmSubmitButton
          message={`「${event.title}」を削除しますか？出欠の回答と写真もすべて削除され、元に戻せません。`}
          className="w-full rounded-xl py-3 text-sm font-bold text-red-500 hover:bg-red-50"
        >
          この予定を削除する
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
