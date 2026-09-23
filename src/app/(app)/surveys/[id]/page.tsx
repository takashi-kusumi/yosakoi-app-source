import { notFound } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import {
  getSurveyWithQuestions,
  getSurveyTargetMembers,
  getMemberSurveyResponse,
} from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";

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

  const targetMembers = await getSurveyTargetMembers(id);
  const isTarget = targetMembers.some((m) => m.id === member.id);

  const myResponse = await getMemberSurveyResponse(id, member.id);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <div>
        <h1 className="text-lg font-bold text-neutral-900">{detail.survey.title}</h1>
        {detail.survey.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500">
            {detail.survey.description}
          </p>
        )}
      </div>

      {!isTarget ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          このアンケートの対象者ではありません
        </p>
      ) : !detail.survey.isOpen ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
            このアンケートは回答受付を終了しています
          </p>
          {myResponse && (
            <div className="space-y-3">
              {detail.questions.map((q, index) => {
                const answer = myResponse.byQuestionId.get(q.id);
                return (
                  <div key={q.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <p className="mb-2 text-sm font-semibold text-neutral-800">
                      Q{index + 1}. {q.questionText}
                    </p>
                    {q.type === "TEXT" ? (
                      <p className="whitespace-pre-wrap text-sm text-neutral-600">
                        {answer?.textAnswer || "（未回答）"}
                      </p>
                    ) : (
                      <p className="text-sm text-neutral-600">
                        {q.options
                          .filter((o) => answer?.optionIds.includes(o.id))
                          .map((o) => o.label)
                          .join("、") || "（未回答）"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <form action={`/api/surveys/${id}/respond`} method="POST" className="space-y-4">
          {myResponse && (
            <p className="rounded-lg bg-orange-50 px-4 py-3 text-xs text-orange-700">
              すでに回答済みです。送信すると回答内容が上書きされます。
            </p>
          )}
          {detail.questions.map((q, index) => {
            const answer = myResponse?.byQuestionId.get(q.id);
            return (
              <div key={q.id} className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-neutral-800">
                  Q{index + 1}. {q.questionText}
                  {q.required && <span className="ml-1 text-[10px] text-orange-500">必須</span>}
                </p>
                {q.type === "TEXT" && (
                  <textarea
                    name={`q_${q.id}`}
                    rows={3}
                    required={q.required}
                    defaultValue={answer?.textAnswer ?? ""}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                )}
                {q.type === "SINGLE" && (
                  <div className="space-y-1.5">
                    {q.options.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={o.id}
                          required={q.required}
                          defaultChecked={answer?.optionIds.includes(o.id) ?? false}
                          className="h-4 w-4"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === "MULTI" && (
                  <div className="space-y-1.5">
                    {q.options.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          name={`q_${q.id}`}
                          value={o.id}
                          defaultChecked={answer?.optionIds.includes(o.id) ?? false}
                          className="h-4 w-4"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white"
          >
            {myResponse ? "回答を更新する" : "回答する"}
          </button>
        </form>
      )}
    </div>
  );
}
