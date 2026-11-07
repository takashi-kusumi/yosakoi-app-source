import { EVENT_TYPE_OPTIONS } from "@/lib/labels";

export function EventForm({
  action,
  submitLabel,
  defaultValues,
  hiddenFields,
}: {
  action: string;
  submitLabel: string;
  defaultValues?: {
    type?: string;
    title?: string;
    eventDateLocal?: string;
    location?: string;
    description?: string;
    feeAmount?: number | null;
  };
  hiddenFields?: { name: string; value: string }[];
}) {
  return (
    <form
      action={action}
      method="POST"
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
    >
      {hiddenFields?.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">種類</label>
        <select
          name="type"
          required
          defaultValue={defaultValues?.type ?? "PRACTICE"}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">タイトル</label>
        <input
          type="text"
          name="title"
          required
          defaultValue={defaultValues?.title ?? ""}
          placeholder="例: 定期練習"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">日時</label>
        <input
          type="datetime-local"
          name="eventDate"
          defaultValue={defaultValues?.eventDateLocal ?? ""}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">
          場所（任意）
        </label>
        <input
          type="text"
          name="location"
          defaultValue={defaultValues?.location ?? ""}
          placeholder="例: 市民体育館 第2アリーナ"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">
          詳細（任意）
        </label>
        <textarea
          name="description"
          rows={4}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="持ち物・注意事項などの補足"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-neutral-600">
          参加費（任意・円）
        </label>
        <input
          type="number"
          name="feeAmount"
          min={0}
          defaultValue={defaultValues?.feeAmount ?? ""}
          placeholder="空欄の場合は参加費なし"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white"
      >
        {submitLabel}
      </button>
    </form>
  );
}
