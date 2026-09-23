import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { getEventWithResponses, getEventPhotos } from "@/lib/queries";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { RespondForm } from "@/components/RespondForm";
import { FlashMessage } from "@/components/FlashMessage";
import { EventPhotoUpload } from "@/components/EventPhotoUpload";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

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

  const myAnswer = detail.answered.find((a) => a.member.id === member.id);
  const photos = await getEventPhotos(id);

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
        {detail.event.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
            {detail.event.description}
          </p>
        )}
        {detail.event.feeAmount != null && (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
            参加費: {detail.event.feeAmount}円
            {myAnswer?.response.status === "ATTENDING" &&
              (myAnswer.response.feePaid ? "（支払済み）" : "（未払い）")}
            {myAnswer?.response.status !== "ATTENDING" &&
              myAnswer?.response.feePaid &&
              "（支払済み・不参加のため運営にご確認ください）"}
          </p>
        )}
        {!detail.event.isOpen && (
          <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
            このイベントは回答受付を締め切っています
          </p>
        )}
      </div>

      {detail.event.isOpen && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-neutral-700">あなたの回答</p>
          <RespondForm
            eventId={detail.event.id}
            currentStatus={myAnswer?.response.status}
            redirectTo={`/events/${detail.event.id}`}
          />
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-neutral-700">
          回答状況（{detail.answered.filter((a) => !a.member.isGuest).length}/
          {detail.answered.filter((a) => !a.member.isGuest).length + detail.unanswered.length}）
        </p>
        <ul className="space-y-1 text-sm">
          {detail.answered.map(({ member: m, response }) => (
            <li key={m.id} className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0">
              <span className="flex items-center gap-1.5 text-neutral-700">
                {m.displayName}
                {m.isGuest && (
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                    体験
                  </span>
                )}
              </span>
              <span
                className={
                  response.status === "ATTENDING" ? "text-orange-600" : "text-neutral-400"
                }
              >
                {response.status === "ATTENDING" ? "参加" : "不参加"}
              </span>
            </li>
          ))}
          {detail.unanswered.map((m) => (
            <li key={m.id} className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0">
              <span className="text-neutral-400">{m.displayName}</span>
              <span className="text-yellow-600">未回答</span>
            </li>
          ))}
        </ul>
      </div>

      {detail.event.isOpen && member.membershipStatus === "REGULAR" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-neutral-700">体験参加者を追加</p>
          <p className="mb-3 text-xs text-neutral-400">
            体験したいと言っている人（LINEアカウント不要）を、このイベントの参加者として登録できます。
          </p>
          <form
            action={`/api/events/${detail.event.id}/guests`}
            method="POST"
            className="space-y-2"
          >
            <input
              type="text"
              name="displayName"
              required
              placeholder="体験参加者の名前"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              name="email"
              placeholder="メールアドレス（任意）"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
            >
              追加
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-neutral-700">
          写真{photos.length > 0 ? `（${photos.length}枚）` : ""}
        </p>

        <div className="mb-3">
          <EventPhotoUpload eventId={detail.event.id} />
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => {
              const canDelete = member.role === "ADMIN" || photo.uploadedBy === member.id;
              return (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                  <a
                    href={`/api/events/${detail.event.id}/photos/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`/api/events/${detail.event.id}/photos/${photo.id}`}
                      alt={photo.fileName ?? "写真"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                  {canDelete && (
                    <form
                      action={`/api/events/${detail.event.id}/photos/${photo.id}`}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
