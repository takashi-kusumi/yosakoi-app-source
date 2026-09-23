import { getToolMatrix } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { items, members, map } = await getToolMatrix();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">道具マスタ管理</h1>

      <form
        action="/api/admin/tools"
        method="POST"
        className="flex gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
      >
        <input
          type="text"
          name="name"
          required
          placeholder="道具名を入力（例: 鳴子）"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
        >
          追加
        </button>
      </form>

      {items.length > 0 && (
        <p className="text-xs text-neutral-400">●/− をタップすると保有状況を直接変更できます</p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          まだ道具の項目がありません
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-max text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="sticky left-0 z-10 bg-neutral-50 px-3 py-2 font-semibold text-neutral-600">
                  メンバー
                </th>
                {items.map((item) => (
                  <th key={item.id} className="px-3 py-2 font-semibold text-neutral-600">
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-neutral-700">
                    {m.displayName}
                  </td>
                  {items.map((item) => {
                    const owned = map.get(`${m.id}:${item.id}`) ?? false;
                    return (
                      <td key={item.id} className="px-1 py-1 text-center">
                        <form action="/api/admin/member-tools" method="POST">
                          <input type="hidden" name="memberId" value={m.id} />
                          <input type="hidden" name="toolItemId" value={item.id} />
                          <input type="hidden" name="owned" value={(!owned).toString()} />
                          <input type="hidden" name="redirectTo" value="/admin/tools" />
                          <button
                            type="submit"
                            aria-label={`${m.displayName} / ${item.name} を${owned ? "未保有にする" : "保有にする"}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-50"
                          >
                            {owned ? (
                              <span className="text-orange-600">●</span>
                            ) : (
                              <span className="text-neutral-200">−</span>
                            )}
                          </button>
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
