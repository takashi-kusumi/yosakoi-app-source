import { getGroupMatrix } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const { groups, members, map } = await getGroupMatrix();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">グループ管理</h1>
      <p className="text-xs text-neutral-400">
        パート・チームなどのグループを登録し、メンバーを所属させます。アンケートの対象者を絞り込む際に使えます。
      </p>

      <form
        action="/api/admin/groups"
        method="POST"
        className="flex gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
      >
        <input
          type="text"
          name="name"
          required
          placeholder="グループ名を入力（例: 鳴子隊）"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
        >
          追加
        </button>
      </form>

      {groups.length > 0 && (
        <p className="text-xs text-neutral-400">●/− をタップすると所属を直接変更できます</p>
      )}

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          まだグループがありません
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-max text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="sticky left-0 z-10 bg-neutral-50 px-3 py-2 font-semibold text-neutral-600">
                  メンバー
                </th>
                {groups.map((g) => (
                  <th key={g.id} className="px-3 py-2 font-semibold text-neutral-600">
                    {g.name}
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
                  {groups.map((g) => {
                    const belongs = map.get(`${m.id}:${g.id}`) ?? false;
                    return (
                      <td key={g.id} className="px-1 py-1 text-center">
                        <form action="/api/admin/member-groups" method="POST">
                          <input type="hidden" name="memberId" value={m.id} />
                          <input type="hidden" name="groupId" value={g.id} />
                          <input type="hidden" name="belongs" value={(!belongs).toString()} />
                          <input type="hidden" name="redirectTo" value="/admin/groups" />
                          <button
                            type="submit"
                            aria-label={`${m.displayName} / ${g.name} を${belongs ? "所属解除" : "所属"}にする`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-50"
                          >
                            {belongs ? (
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
