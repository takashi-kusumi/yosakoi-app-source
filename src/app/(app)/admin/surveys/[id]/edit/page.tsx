import { notFound } from "next/navigation";
import { getSurveyWithQuestions, getAllGroups, getSurveyResponseCount } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { SurveyForm } from "@/components/SurveyForm";

export default async function EditSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;

  const detail = await getSurveyWithQuestions(id);
  if (!detail) notFound();
  const groups = await getAllGroups();
  const responseCount = await getSurveyResponseCount(id);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">アンケートを編集</h1>
      <SurveyForm
        action={`/api/admin/surveys/${id}`}
        submitLabel="更新する"
        groupOptions={groups.map((g) => ({ id: g.id, name: g.name }))}
        hasExistingResponses={responseCount > 0}
        defaultValues={{
          title: detail.survey.title,
          description: detail.survey.description ?? "",
          targetAll: detail.survey.targetAll,
          targetGroupIds: detail.targetGroupIds,
        }}
        initialQuestions={detail.questions.map((q) => ({
          type: q.type,
          questionText: q.questionText,
          required: q.required,
          options: q.options.map((o) => o.label),
        }))}
      />
    </div>
  );
}
