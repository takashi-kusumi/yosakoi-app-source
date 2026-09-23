import { notFound } from "next/navigation";
import { getNoticeWithAttachments, getEventOptionsForNotice } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { NoticeForm } from "@/components/NoticeForm";

export default async function EditNoticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const detail = await getNoticeWithAttachments(id);
  if (!detail) notFound();
  const eventOptions = await getEventOptionsForNotice();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">お知らせを編集</h1>
      <NoticeForm
        action={`/api/admin/notices/${id}`}
        submitLabel="更新する"
        hiddenFields={[{ name: "action", value: "update" }]}
        eventOptions={eventOptions}
        defaultValues={{
          title: detail.notice.title,
          body: detail.notice.body ?? "",
          eventId: detail.notice.eventId ?? "",
          externalUrl: detail.notice.externalUrl ?? "",
        }}
        existingAttachments={detail.attachments}
        deleteAction={`/api/admin/notices/${id}`}
      />
    </div>
  );
}
