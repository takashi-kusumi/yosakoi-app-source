import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getSurveysForMember } from "@/lib/queries";
import { formatDateTime, isSurveyOpen } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const rows = await getSurveysForMember(member.id);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">アンケート</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          現在対象のアンケートはありません
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ survey, answered }) => (
            <li key={survey.id}>
              <Link
                href={`/surveys/${survey.id}`}
                className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  {!isSurveyOpen(survey) ? (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                      締切
                    </span>
                  ) : answered ? (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      回答済み
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      未回答
                    </span>
                  )}
                </div>
                <p className="font-semibold text-neutral-900">{survey.title}</p>
                <p className="text-xs text-neutral-500">
                  {formatDateTime(survey.createdAt)}
                  {survey.closesAt && ` ・ 締切 ${formatDateTime(survey.closesAt)}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
