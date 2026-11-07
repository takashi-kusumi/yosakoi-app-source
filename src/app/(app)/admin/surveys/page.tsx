import Link from "next/link";
import { getSurveysWithCounts } from "@/lib/queries";
import { deadlineLabel, isSurveyOpen } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { BackLink, EmptyState, ListLinkCard, PageTitle, primaryButton } from "@/components/ui";

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
      <BackLink href="/admin" label="管理" />
      <PageTitle
        action={
          <Link href="/admin/surveys/new" className={primaryButton}>
            ＋ 作成
          </Link>
        }
      >
        アンケート管理
      </PageTitle>
      {rows.length === 0 && <EmptyState>まだアンケートはありません</EmptyState>}
      <div className="space-y-2.5">
        {rows.map(({ survey, responseCount, targetCount }) => {
          const open = isSurveyOpen(survey);
          return (
            <ListLinkCard key={survey.id} href={`/admin/surveys/${survey.id}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-bold text-neutral-900">{survey.title}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    open ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {open ? "受付中" : "受付終了"}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                回答 {responseCount} / {targetCount}人
                {open && deadlineLabel(survey.closesAt) && ` ・ ${deadlineLabel(survey.closesAt)}`}
              </p>
            </ListLinkCard>
          );
        })}
      </div>
    </div>
  );
}
