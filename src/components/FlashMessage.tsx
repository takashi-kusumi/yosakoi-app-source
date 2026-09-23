export function FlashMessage({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div className="mb-4 space-y-2">
      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {ok}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
