import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getNoticeWithAttachments } from "@/lib/queries";
import { formatDateTime } from "@/lib/labels";
import { ATTACHMENT_TYPE_ICON, formatFileSize } from "@/lib/notices";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export default async function NoticeDetailPage({
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

  const detail = await getNoticeWithAttachments(id);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <div>
        {detail.eventTitle && detail.notice.eventId && (
          <Link
            href={`/events/${detail.notice.eventId}`}
            className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700"
          >
            {detail.eventTitle}
          </Link>
        )}
        <h1 className="mt-2 text-xl font-bold text-neutral-900">{detail.notice.title}</h1>
        <p className="mt-1 text-xs text-neutral-400">
          {formatDateTime(detail.notice.createdAt)}
          {detail.authorName && ` ・ ${detail.authorName}`}
        </p>
      </div>

      {detail.notice.body && (
        <p className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 shadow-sm">
          {detail.notice.body}
        </p>
      )}

      {detail.notice.externalUrl && (
        <a
          href={detail.notice.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 shadow-sm"
        >
          <span>🔗 写真・関連リンクを見る</span>
          <span aria-hidden>↗</span>
        </a>
      )}

      {detail.attachments.length > 0 && (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-neutral-700">添付ファイル</p>
          <ul className="space-y-2">
            {detail.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/notices/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{ATTACHMENT_TYPE_ICON[a.mimeType] ?? "📎"}</span>
                    <span className="truncate text-neutral-700">{a.fileName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatFileSize(a.fileSize)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {member.role === "ADMIN" && (
        <div className="flex gap-2">
          <Link
            href={`/admin/notices/${detail.notice.id}/edit`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            編集する
          </Link>
          <form action={`/api/admin/notices/${detail.notice.id}`} method="POST">
            <input type="hidden" name="action" value="delete" />
            <ConfirmSubmitButton
              message="このお知らせを削除しますか？添付ファイルもすべて削除されます。"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-red-500"
            >
              削除する
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
