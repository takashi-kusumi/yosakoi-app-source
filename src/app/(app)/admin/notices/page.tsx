import Link from "next/link";
import { getNoticesList } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { BackLink, EmptyState, PageTitle, primaryButton } from "@/components/ui";
import { NoticeListItem } from "@/components/NoticeListItem";

export default async function AdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const rows = await getNoticesList();
  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href="/admin" label="管理" />
      <PageTitle
        action={
          <Link href="/admin/notices/new" className={primaryButton}>
            ＋ 作成
          </Link>
        }
      >
        お知らせ管理
      </PageTitle>
      {rows.length === 0 && <EmptyState>まだお知らせはありません</EmptyState>}
      <div className="space-y-2.5">
        {rows.map(({ notice, eventTitle, attachmentCount }) => (
          <NoticeListItem key={notice.id} notice={notice} eventTitle={eventTitle} attachmentCount={attachmentCount} />
        ))}
      </div>
    </div>
  );
}
