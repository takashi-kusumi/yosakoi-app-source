import { FlashMessage } from "@/components/FlashMessage";
import { SurveyForm } from "@/components/SurveyForm";
import { BackLink, PageTitle } from "@/components/ui";

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href="/admin/surveys" label="アンケート管理" />
      <PageTitle>アンケートを作成</PageTitle>
      <p className="text-xs text-neutral-400">メンバー全員が回答の対象になります。</p>
      <SurveyForm action="/api/admin/surveys" submitLabel="作成する" />
    </div>
  );
}
