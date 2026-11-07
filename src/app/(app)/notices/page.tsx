import Link from "next/link";
import { getNoticesList, markNoticesSeen } from "@/lib/queries";
import { getCurrentMember } from "@/lib/auth";
import { FlashMessage } from "@/components/FlashMessage";
import { EmptyState, PageTitle, primaryButton } from "@/components/ui";
import { NoticeListItem } from "@/components/NoticeListItem";

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;
  const rows = await getNoticesList();
  const lastSeen = member.lastSeenNoticesAt;
  // この一覧を開いたタイミングで既読にする（ナビの未読バッジをクリアするため）
  await markNoticesSeen(member.id);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <PageTitle
        action={
          member.role === "ADMIN" ? (
            <Link href="/admin/notices/new" className={primaryButton}>
              ＋ 作成
            </Link>
          ) : undefined
        }
      >
        お知らせ
      </PageTitle>
      {rows.length === 0 && <EmptyState>まだお知らせはありません</EmptyState>}
      <div className="space-y-2.5">
        {rows.map(({ notice, eventTitle, attachmentCount }) => (
          <NoticeListItem
            key={notice.id}
            notice={notice}
            eventTitle={eventTitle}
            attachmentCount={attachmentCount}
            unread={!lastSeen || notice.createdAt > lastSeen}
          />
        ))}
      </div>
    </div>
  );
}
