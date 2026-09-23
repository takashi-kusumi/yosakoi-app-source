import Link from "next/link";
import { getSurveysWithCounts } from "@/lib/queries";
import { formatDateTime } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";

export default async function AdminSurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const rows = await getSurveysWithCounts();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">アンケート管理</h1>
        <Link
          href="/admin/surveys/new"
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ＋アンケート作成
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          まだアンケートがありません
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ survey, responseCount, targetCount }) => (
            <li key={survey.id}>
              <Link
                href={`/admin/surveys/${survey.id}`}
                className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                    {survey.targetAll ? "全員対象" : "グループ対象"}
                  </span>
                  {!survey.isOpen && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                      締切
                    </span>
                  )}
                </div>
                <p className="font-semibold text-neutral-900">{survey.title}</p>
                <p className="text-xs text-neutral-500">{formatDateTime(survey.createdAt)}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  回答 {responseCount}/{targetCount}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
