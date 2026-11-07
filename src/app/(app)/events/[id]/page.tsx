import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getEventWithResponses, getEventPhotos } from "@/lib/queries";
import { formatEventDate } from "@/lib/labels";
import { RespondForm } from "@/components/RespondForm";
import { FlashMessage } from "@/components/FlashMessage";
import { EventPhotoUpload } from "@/components/EventPhotoUpload";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TypeChip, StatusBadge } from "@/components/EventCard";
import { AttendanceList } from "@/components/AttendanceList";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const detail = await getEventWithResponses(id);
  if (!detail) notFound();
  const photos = await getEventPhotos(id);

  const { event } = detail;
  const isAdmin = member.role === "ADMIN";
  const myAnswer = detail.answered.find((a) => a.member.id === member.id);
  const selfPath = `/events/${event.id}`;
  const attendingCount = detail.answered.filter((a) => a.response.status === "ATTENDING").length;
  const mapUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
    : null;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <Link href="/events" className="text-sm font-semibold text-neutral-500">
          ‹ 予定
        </Link>
        {isAdmin && (
          <Link
            href={`/admin/events/${event.id}`}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            管理する
          </Link>
        )}
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeChip type={event.type} />
          {!event.isOpen && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
              受付終了
            </span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight text-neutral-900">{event.title}</h1>

        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-5 shrink-0 text-center" aria-label="日時">🗓</dt>
            <dd className="font-semibold text-neutral-800">{formatEventDate(event.eventDate)}</dd>
          </div>
          {event.location && (
            <div className="flex gap-2">
              <dt className="w-5 shrink-0 text-center" aria-label="場所">📍</dt>
              <dd className="text-neutral-700">
                {event.location}
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs font-semibold text-orange-600"
                  >
                    地図 ↗
                  </a>
                )}
              </dd>
            </div>
          )}
          {event.feeAmount != null && (
            <div className="flex gap-2">
              <dt className="w-5 shrink-0 text-center" aria-label="参加費">💴</dt>
              <dd className="text-neutral-700">
                参加費 {event.feeAmount.toLocaleString()}円
                {myAnswer?.response.status === "ATTENDING" && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      myAnswer.response.feePaid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {myAnswer.response.feePaid ? "支払済み" : "未払い"}
                  </span>
                )}
              </dd>
            </div>
          )}
        </dl>

        {event.description && (
          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-neutral-50 px-3.5 py-3 text-sm leading-relaxed text-neutral-700">
            {event.description}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-800">あなたの回答</h2>
          <StatusBadge status={myAnswer?.response.status} />
        </div>
        {event.isOpen ? (
          <RespondForm
            eventId={event.id}
            currentStatus={myAnswer?.response.status}
            currentNote={myAnswer?.response.note}
            redirectTo={selfPath}
            variant="full"
          />
        ) : (
          <p className="text-sm text-neutral-500">
            回答の受付は終了しました。
            {myAnswer?.response.note && <span className="mt-1 block">💬 {myAnswer.response.note}</span>}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-neutral-800">
          参加状況
          <span className="ml-2 text-xs font-semibold text-emerald-600">参加 {attendingCount}人</span>
        </h2>
        <AttendanceList
          eventId={event.id}
          answered={detail.answered}
          unanswered={detail.unanswered}
          nameById={detail.nameById}
          viewer={{ id: member.id, isAdmin }}
          redirectTo={selfPath}
        />
      </section>

      {event.isOpen && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-800">体験者を追加</h2>
          <p className="mt-1 text-xs text-neutral-400">
            体験に来る人を、名前だけで参加者に追加できます（体験者本人のログインは不要です）。
          </p>
          <form action={`/api/events/${event.id}/guests`} method="POST" className="mt-3 space-y-2">
            <input type="hidden" name="action" value="add" />
            <input type="hidden" name="redirectTo" value={selfPath} />
            <input
              type="text"
              name="displayName"
              required
              maxLength={50}
              placeholder="体験者の名前"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <input
              type="text"
              name="note"
              maxLength={100}
              placeholder="メモ（任意）例: ○○さんの友人"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <button type="submit" className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white">
              追加する
            </button>
          </form>
        </section>
      )}

      {(photos.length > 0 || isAdmin) && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-neutral-800">
            写真{photos.length > 0 ? `（${photos.length}枚）` : ""}
          </h2>
          {isAdmin && (
            <div className="mb-3">
              <EventPhotoUpload eventId={event.id} />
            </div>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                  <a href={`/api/events/${event.id}/photos/${photo.id}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/events/${event.id}/photos/${photo.id}`}
                      alt={photo.fileName ?? "写真"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                  {isAdmin && (
                    <form
                      action={`/api/events/${event.id}/photos/${photo.id}`}
                      method="POST"
                      className="absolute right-1 top-1"
                    >
                      <input type="hidden" name="action" value="delete" />
                      <ConfirmSubmitButton
                        message="この写真を削除しますか？"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                      >
                        ✕
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
