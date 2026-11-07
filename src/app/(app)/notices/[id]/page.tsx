import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getNoticeWithAttachments } from "@/lib/queries";
import { formatDateTime } from "@/lib/labels";
import { ATTACHMENT_TYPE_ICON, formatFileSize } from "@/lib/notices";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { BackLink, Card, secondaryButton } from "@/components/ui";
import { ShareTextCard } from "@/components/ShareTextCard";
import { noticeShareTemplates } from "@/lib/shareText";
import { getAppUrl } from "@/lib/serverAppUrl";

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
  const images = detail.attachments.filter((a) => a.mimeType.startsWith("image/"));
  const files = detail.attachments.filter((a) => !a.mimeType.startsWith("image/"));

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href="/notices" label="お知らせ" />

      <Card>
        {detail.eventTitle && detail.notice.eventId && (
          <Link
            href={`/events/${detail.notice.eventId}`}
            className="mb-2 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700"
          >
            📅 {detail.eventTitle} ›
          </Link>
        )}
        <h1 className="text-xl font-bold leading-snug tracking-tight text-neutral-900">{detail.notice.title}</h1>
        <p className="mt-1 text-xs text-neutral-400">
          {formatDateTime(detail.notice.createdAt)}
          {detail.authorName && ` ・ ${detail.authorName}`}
        </p>
        {detail.notice.body && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{detail.notice.body}</p>
        )}

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {images.map((a) => (
              <a
                key={a.id}
                href={`/api/notices/attachments/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl bg-neutral-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/notices/attachments/${a.id}`} alt={a.fileName} className="aspect-square w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}

        {detail.notice.externalUrl && (
          <a
            href={detail.notice.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700"
          >
            <span>🔗 写真・関連リンクを開く</span>
            <span aria-hidden>↗</span>
          </a>
        )}

        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/notices/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{ATTACHMENT_TYPE_ICON[a.mimeType] ?? "📎"}</span>
                    <span className="truncate text-neutral-700">{a.fileName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">{formatFileSize(a.fileSize)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {member.role === "ADMIN" && (
        <ShareTextCard templates={noticeShareTemplates(detail.notice, { appUrl: await getAppUrl() })} />
      )}

      {member.role === "ADMIN" && (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/admin/notices/${detail.notice.id}/edit`} className={secondaryButton}>
            編集する
          </Link>
          <form action={`/api/admin/notices/${detail.notice.id}`} method="POST">
            <input type="hidden" name="action" value="delete" />
            <ConfirmSubmitButton
              message="このお知らせを削除しますか？添付ファイルもすべて削除されます。"
              className={`${secondaryButton} w-full text-red-500`}
            >
              削除する
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
