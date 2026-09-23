import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FlashMessage } from "@/components/FlashMessage";
import { EventForm } from "@/components/EventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; from?: string }>;
}) {
  const { ok, error, from } = await searchParams;

  let defaultValues:
    | {
        type?: string;
        title?: string;
        location?: string;
        description?: string;
        feeAmount?: number | null;
      }
    | undefined;
  if (from) {
    const [source] = await db.select().from(events).where(eq(events.id, from)).limit(1);
    if (source) {
      defaultValues = {
        type: source.type,
        title: source.title,
        location: source.location ?? "",
        description: source.description ?? "",
        feeAmount: source.feeAmount,
      };
    }
  }

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <div>
        <h1 className="text-lg font-bold text-neutral-900">イベントを作成</h1>
        {from && defaultValues && (
          <p className="mt-1 text-xs text-neutral-400">
            「{defaultValues.title}」の内容をコピーしました。日時を変更してください。
          </p>
        )}
      </div>

      <EventForm action="/api/admin/events" submitLabel="作成する" defaultValues={defaultValues} />
    </div>
  );
}
