type Status = "ATTENDING" | "NOT_ATTENDING" | "UNDECIDED" | null | undefined;

export function RespondForm({
  eventId,
  currentStatus,
  redirectTo,
}: {
  eventId: string;
  currentStatus: Status;
  redirectTo: string;
}) {
  return (
    <div className="flex gap-2">
      <form action={`/api/events/${eventId}/respond`} method="POST" className="flex-1">
        <input type="hidden" name="status" value="ATTENDING" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            currentStatus === "ATTENDING"
              ? "border-orange-600 bg-orange-600 text-white"
              : "border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
          }`}
        >
          参加する
        </button>
      </form>
      <form action={`/api/events/${eventId}/respond`} method="POST" className="flex-1">
        <input type="hidden" name="status" value="UNDECIDED" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            currentStatus === "UNDECIDED"
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-neutral-200 bg-white text-neutral-600 hover:border-sky-300"
          }`}
        >
          未定
        </button>
      </form>
      <form action={`/api/events/${eventId}/respond`} method="POST" className="flex-1">
        <input type="hidden" name="status" value="NOT_ATTENDING" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            currentStatus === "NOT_ATTENDING"
              ? "border-neutral-600 bg-neutral-600 text-white"
              : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
          }`}
        >
          不参加
        </button>
      </form>
    </div>
  );
}
