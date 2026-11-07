import { getCurrentMember } from "@/lib/auth";
import { getSurveysForMember } from "@/lib/queries";
import { deadlineLabel, formatDateTime, isSurveyOpen } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { EmptyState, ListLinkCard, PageTitle } from "@/components/ui";

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const rows = await getSurveysForMember(member.id);
  const pending = rows.filter((r) => !r.answered && isSurveyOpen(r.survey));
  const others = rows.filter((r) => !(!r.answered && isSurveyOpen(r.survey)));

  const item = ({ survey, answered }: (typeof rows)[number]) => {
    const open = isSurveyOpen(survey);
    const deadline = open ? deadlineLabel(survey.closesAt) : null;
    return (
      <ListLinkCard key={survey.id} href={`/surveys/${survey.id}`} highlight={open && !answered}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-bold text-neutral-900">{survey.title}</p>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
              !open
                ? "bg-neutral-100 text-neutral-500"
                : answered
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {!open ? "受付終了" : answered ? "回答済み" : "未回答"}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          {deadline ?? formatDateTime(survey.createdAt)}
        </p>
      </ListLinkCard>
    );
  };

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <PageTitle>アンケート</PageTitle>

      {rows.length === 0 && <EmptyState>まだアンケートはありません</EmptyState>}

      {pending.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold text-neutral-700">回答をお願いします（{pending.length}件）</h2>
          {pending.map(item)}
        </section>
      )}
      {others.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-sm font-bold text-neutral-700">回答済み・終了</h2>
          {others.map(item)}
        </section>
      )}
    </div>
  );
}
