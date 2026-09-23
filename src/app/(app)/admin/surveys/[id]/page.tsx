import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveyResults } from "@/lib/queries";
import { formatDateTime, isSurveyOpen } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

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

  const unansweredWithLine = results.unansweredMembers.filter((m) => m.lineUserId).length;

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div>
        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          {results.survey.targetAll ? "全員対象" : "グループ対象"}
        </span>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">{results.survey.title}</h1>
        {results.survey.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
            {results.survey.description}
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-400">
          {formatDateTime(results.survey.createdAt)}
          {results.survey.closesAt && ` ・ 締切 ${formatDateTime(results.survey.closesAt)}`}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/surveys/${id}/edit`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
          >
            編集する
          </Link>
          <form action={`/api/admin/surveys/${id}`} method="POST" className="inline-block">
            <input type="hidden" name="action" value={results.survey.isOpen ? "close" : "reopen"} />
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600"
            >
              {results.survey.isOpen ? "回答受付を締め切る" : "受付を再開する"}
            </button>
          </form>
          <form action={`/api/admin/surveys/${id}`} method="POST" className="inline-block">
            <input type="hidden" name="action" value="delete" />
            <ConfirmSubmitButton
              message="このアンケートを削除しますか？回答もすべて削除されます。"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-red-500"
            >
              削除する
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">LINEでリマインド送信</h2>
        <p className="text-xs text-neutral-400">
          未回答: {results.unansweredMembers.length}名（LINE連携済み {unansweredWithLine}名）
        </p>
        <form action="/api/admin/survey-remind" method="POST" className="space-y-3">
          <input type="hidden" name="surveyId" value={id} />
          <textarea
            name="message"
            rows={3}
            placeholder="空欄の場合は定型メッセージを送信します"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
            disabled={unansweredWithLine === 0}
          >
            未回答者に送信
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-neutral-700">
          回答状況（{results.responseCount}/{results.targetCount}）
        </p>
      </section>

      <section className="space-y-4">
        {results.questionResults.map((qr, index) => (
          <div key={qr.question.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-neutral-800">
              Q{index + 1}. {qr.question.questionText}
              {qr.question.required && <span className="ml-1 text-[10px] text-orange-500">必須</span>}
            </p>

            {qr.kind === "TEXT" ? (
              qr.items.length === 0 ? (
                <p className="text-xs text-neutral-400">まだ回答がありません</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {qr.items.map((item, i) => (
                    <li key={i} className="border-b border-neutral-100 pb-2 last:border-0">
                      <p className="text-[11px] font-semibold text-neutral-400">{item.memberName}</p>
                      <p className="whitespace-pre-wrap text-neutral-700">{item.text}</p>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul className="space-y-2">
                {qr.options.map(({ option, count }) => {
                  const pct = qr.answeredCount > 0 ? Math.round((count / qr.answeredCount) * 100) : 0;
                  return (
                    <li key={option.id} className="text-xs">
                      <div className="mb-1 flex items-center justify-between text-neutral-600">
                        <span>{option.label}</span>
                        <span>{count}件</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-neutral-700">未回答者（{results.unansweredMembers.length}名）</p>
        {results.unansweredMembers.length === 0 ? (
          <p className="text-xs text-neutral-400">全員が回答済みです</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {results.unansweredMembers.map((m) => (
              <li key={m.id} className="border-b border-neutral-100 py-1.5 text-neutral-400 last:border-0">
                {m.displayName}
                {!m.lineUserId && <span className="ml-1 text-[10px] text-neutral-300">(LINE未連携)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
