export function FlashMessage({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div className="space-y-2">
      {ok && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span aria-hidden>✓</span>
          {ok}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <span aria-hidden>!</span>
          {error}
        </p>
      )}
    </div>
  );
}
