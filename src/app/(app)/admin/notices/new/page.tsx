import { getEventOptionsForNotice } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { NoticeForm } from "@/components/NoticeForm";

export default async function NewNoticePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const eventOptions = await getEventOptionsForNotice();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">お知らせを作成</h1>
      <NoticeForm action="/api/admin/notices" submitLabel="作成する" eventOptions={eventOptions} />
    </div>
  );
}
