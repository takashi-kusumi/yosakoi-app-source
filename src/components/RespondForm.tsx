type Status = "ATTENDING" | "NOT_ATTENDING" | "UNDECIDED" | null | undefined;

const OPTIONS = [
  {
    value: "ATTENDING",
    label: "参加",
    active: "border-emerald-600 bg-emerald-600 text-white shadow-sm",
  },
  {
    value: "UNDECIDED",
    label: "未定",
    active: "border-sky-600 bg-sky-600 text-white shadow-sm",
  },
  {
    value: "NOT_ATTENDING",
    label: "不参加",
    active: "border-neutral-600 bg-neutral-600 text-white shadow-sm",
  },
] as const;

const idle = "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 active:bg-neutral-50";

/**
 * 出欠の回答ボタン。
 * - compact（ホームのカード用）: ボタンだけ。押すとすぐ回答（既存のメモはそのまま残る）
 * - full（予定の詳細用）: メモ欄つき。ボタンを押すと回答とメモを一緒に保存する
 */
export function RespondForm({
  eventId,
  currentStatus,
  currentNote,
  redirectTo,
  variant = "compact",
}: {
  eventId: string;
  currentStatus: Status;
  currentNote?: string | null;
  redirectTo: string;
  variant?: "compact" | "full";
}) {
  return (
    <form action={`/api/events/${eventId}/respond`} method="POST" className="space-y-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {variant === "full" && (
        <div>
          <label htmlFor={`note-${eventId}`} className="mb-1 block text-xs font-semibold text-neutral-500">
            メモ（任意）
          </label>
          <input
            id={`note-${eventId}`}
            type="text"
            name="note"
            maxLength={100}
            defaultValue={currentNote ?? ""}
            placeholder="例: 30分遅れます / 途中で抜けます"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="submit"
            name="status"
            value={opt.value}
            aria-pressed={currentStatus === opt.value}
            className={`rounded-xl border py-2.5 text-sm font-bold transition ${
              currentStatus === opt.value ? opt.active : idle
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {variant === "full" && currentStatus && (
        <p className="text-[11px] text-neutral-400">メモだけ変えたいときは、今の回答のボタンをもう一度押してください。</p>
      )}
    </form>
  );
}
