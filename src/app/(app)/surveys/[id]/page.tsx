import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getSurveyWithQuestions, getMemberSurveyResponse } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { deadlineLabel, formatDateTime, isSurveyOpen } from "@/lib/labels";
import { BackLink, Card } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100";
const choiceClass =
  "flex cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-700 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50";

export default async function SurveyAnswerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const detail = await getSurveyWithQuestions(id);
  if (!detail) notFound();
  const myResponse = await getMemberSurveyResponse(id, member.id);
  const open = isSurveyOpen(detail.survey);
  const deadline = open ? deadlineLabel(detail.survey.closesAt) : null;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <div className="flex items-center justify-between">
        <BackLink href="/surveys" label="アンケート" />
        {member.role === "ADMIN" && (
          <Link
            href={`/admin/surveys/${id}`}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            集計を見る
          </Link>
        )}
      </div>

      <Card>
        <h1 className="text-xl font-bold leading-snug tracking-tight text-neutral-900">{detail.survey.title}</h1>
        {detail.survey.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
            {detail.survey.description}
          </p>
        )}
        <p className="mt-2 text-xs font-semibold text-neutral-400">
          {open ? deadline ?? "締切なし" : `受付終了${detail.survey.closesAt ? `（${formatDateTime(detail.survey.closesAt)}）` : ""}`}
        </p>
      </Card>

      {!open ? (
        <div className="space-y-3">
          {myResponse ? (
            detail.questions.map((q, index) => {
              const answer = myResponse.byQuestionId.get(q.id);
              return (
                <Card key={q.id}>
                  <p className="mb-2 text-sm font-bold text-neutral-800">
                    Q{index + 1}. {q.questionText}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-neutral-600">
                    {q.type === "TEXT"
                      ? answer?.textAnswer || "（未回答）"
                      : q.options
                          .filter((o) => answer?.optionIds.includes(o.id))
                          .map((o) => o.label)
                          .join("、") || "（未回答）"}
                  </p>
                </Card>
              );
            })
          ) : (
            <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
              このアンケートは回答の受付を終了しました。
            </p>
          )}
        </div>
      ) : (
        <form action={`/api/surveys/${id}/respond`} method="POST" className="space-y-3">
          {myResponse && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
              回答済みです。内容を変えて送信すると、回答が上書きされます。
            </p>
          )}
          {detail.questions.map((q, index) => {
            const answer = myResponse?.byQuestionId.get(q.id);
            return (
              <Card key={q.id} className="space-y-3">
                <p className="text-sm font-bold text-neutral-800">
                  Q{index + 1}. {q.questionText}
                  {q.required && <span className="ml-1.5 text-[11px] font-bold text-orange-600">必須</span>}
                </p>
                {q.type === "TEXT" && (
                  <textarea
                    name={`q_${q.id}`}
                    rows={3}
                    required={q.required}
                    defaultValue={answer?.textAnswer ?? ""}
                    className={inputClass}
                  />
                )}
                {q.type !== "TEXT" && (
                  <div className="space-y-2">
                    {q.options.map((o) => (
                      <label key={o.id} className={choiceClass}>
                        <input
                          type={q.type === "SINGLE" ? "radio" : "checkbox"}
                          name={`q_${q.id}`}
                          value={o.id}
                          required={q.type === "SINGLE" && q.required}
                          defaultChecked={answer?.optionIds.includes(o.id) ?? false}
                          className="h-4 w-4 accent-orange-600"
                        />
                        {o.label}
                      </label>
                    ))}
                    {q.type === "MULTI" && <p className="text-[11px] text-neutral-400">複数選べます</p>}
                  </div>
                )}
              </Card>
            );
          })}
          <button type="submit" className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white">
            {myResponse ? "回答を更新する" : "回答する"}
          </button>
        </form>
      )}
    </div>
  );
}
