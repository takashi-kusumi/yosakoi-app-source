import { getCurrentMember } from "@/lib/auth";
import { getToolsForMember } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const tools = await getToolsForMember(member.id);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <div>
        <h1 className="text-lg font-bold text-neutral-900">道具の保有状況</h1>
        <p className="mt-1 text-sm text-neutral-500">
          持っている道具にチェックを入れてください
        </p>
      </div>

      {tools.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          まだ道具の項目が登録されていません
        </p>
      )}

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {tools.map(({ item, owned }) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-neutral-800">{item.name}</span>
            <form action={`/api/tools/${item.id}/toggle`} method="POST">
              <input type="hidden" name="owned" value={(!owned).toString()} />
              <input type="hidden" name="redirectTo" value="/tools" />
              <button
                type="submit"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  owned
                    ? "bg-orange-600 text-white"
                    : "border border-neutral-300 text-neutral-500"
                }`}
              >
                {owned ? "保有している" : "未保有"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
