import { notFound } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toDatetimeLocalValue } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { EventForm } from "@/components/EventForm";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-xl font-bold tracking-tight text-neutral-900">予定を編集</h1>

      <EventForm
        action={`/api/admin/events/${event.id}`}
        submitLabel="更新する"
        hiddenFields={[{ name: "action", value: "update" }]}
        defaultValues={{
          type: event.type,
          title: event.title,
          eventDateLocal: toDatetimeLocalValue(event.eventDate),
          location: event.location ?? "",
          description: event.description ?? "",
          feeAmount: event.feeAmount,
        }}
      />
    </div>
  );
}
