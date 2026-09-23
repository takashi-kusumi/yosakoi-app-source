import { getAllGroups } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { SurveyForm } from "@/components/SurveyForm";

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const groups = await getAllGroups();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">アンケートを作成</h1>
      <SurveyForm
        action="/api/admin/surveys"
        submitLabel="作成する"
        groupOptions={groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
