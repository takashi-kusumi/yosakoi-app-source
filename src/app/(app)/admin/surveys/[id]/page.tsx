import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveyResults } from "@/lib/queries";
import { deadlineLabel, formatDateTime, isSurveyOpen } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { BackLink, Card, secondaryButton } from "@/components/ui";
import { ShareTextCard } from "@/components/ShareTextCard";
import { surveyShareTemplates } from "@/lib/shareText";
import { getAppUrl } from "@/lib/serverAppUrl";

export default async function AdminSurveyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const results = await getSurveyResults(id);
  if (!results) notFound();
  const open = isSurveyOpen(results.survey);
  const action = `/api/admin/surveys/${id}`;
  const shareTemplates = surveyShareTemplates(results.survey, {
    appUrl: await getAppUrl(),
    unansweredNames: results.unansweredMembers.map((m) => m.displayName),
  });
  const pct = results.targetCount > 0 ? Math.round((results.responseCount / results.targetCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href="/admin/surveys" label="アンケート管理" />

      <Card>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            open ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {open ? "受付中" : "受付終了"}
        </span>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{results.survey.title}</h1>
        <p className="mt-1 text-xs text-neutral-400">
          作成 {formatDateTime(results.survey.createdAt)}
          {results.survey.closesAt &&
            ` ・ ${open ? deadlineLabel(results.survey.closesAt) : `締切 ${formatDateTime(results.survey.closesAt)}`}`}
        </p>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-600">
            <span>回答状況</span>
            <span>
              {results.responseCount} / {results.targetCount}人（{pct}%）
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/admin/surveys/${id}/edit`} className={secondaryButton}>
            編集する
          </Link>
          <form action={action} method="POST">
            <input type="hidden" name="action" value={results.survey.isOpen ? "close" : "reopen"} />
            <button type="submit" className={`${secondaryButton} w-full`}>
              {results.survey.isOpen ? "受付を締め切る" : "受付を再開する"}
            </button>
          </form>
          <Link href={`/surveys/${id}`} className={`${secondaryButton} col-span-2`}>
            回答画面を見る
          </Link>
        </div>
      </Card>

      <ShareTextCard templates={shareTemplates} />

      {results.questionResults.map((qr, index) => (
        <Card key={qr.question.id}>
          <p className="mb-3 text-sm font-bold text-neutral-800">
            Q{index + 1}. {qr.question.questionText}
          </p>
          {qr.kind === "TEXT" ? (
            qr.items.length === 0 ? (
              <p className="text-xs text-neutral-400">まだ回答がありません</p>
            ) : (
              <ul className="divide-y divide-neutral-100 text-sm">
                {qr.items.map((item, i) => (
                  <li key={i} className="py-2">
                    <p className="text-[11px] font-semibold text-neutral-400">{item.memberName}</p>
                    <p className="whitespace-pre-wrap text-neutral-700">{item.text}</p>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul className="space-y-3">
              {qr.options.map(({ option, count, names }) => {
                const p = qr.answeredCount > 0 ? Math.round((count / qr.answeredCount) * 100) : 0;
                return (
                  <li key={option.id} className="text-xs">
                    <div className="mb-1 flex items-center justify-between text-neutral-700">
                      <span className="font-semibold">{option.label}</span>
                      <span>
                        {count}人（{p}%）
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${p}%` }} />
                    </div>
                    {names.length > 0 && <p className="mt-1 text-[11px] text-neutral-400">{names.join("、")}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ))}

      <Card>
        <p className="mb-2 text-sm font-bold text-neutral-800">未回答（{results.unansweredMembers.length}人）</p>
        {results.unansweredMembers.length === 0 ? (
          <p className="text-xs text-neutral-400">全員が回答済みです</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {results.unansweredMembers.map((m) => (
              <span key={m.id} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                {m.displayName}
              </span>
            ))}
          </div>
        )}
      </Card>

      <form action={action} method="POST">
        <input type="hidden" name="action" value="delete" />
        <ConfirmSubmitButton
          message="このアンケートを削除しますか？回答もすべて削除されます。"
          className="w-full rounded-xl py-3 text-sm font-bold text-red-500 hover:bg-red-50"
        >
          このアンケートを削除する
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
