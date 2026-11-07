import { notFound } from "next/navigation";
import { getSurveyWithQuestions, getSurveyResponseCount } from "@/lib/queries";
import { toDatetimeLocalValue } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { SurveyForm } from "@/components/SurveyForm";
import { BackLink, PageTitle } from "@/components/ui";

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
  const responseCount = await getSurveyResponseCount(id);

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href={`/admin/surveys/${id}`} label="集計" />
      <PageTitle>アンケートを編集</PageTitle>
      <SurveyForm
        action={`/api/admin/surveys/${id}`}
        submitLabel="更新する"
        hasExistingResponses={responseCount > 0}
        defaultValues={{
          title: detail.survey.title,
          description: detail.survey.description ?? "",
          closesAtLocal: toDatetimeLocalValue(detail.survey.closesAt),
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
