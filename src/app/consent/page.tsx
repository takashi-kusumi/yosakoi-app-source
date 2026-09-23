import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/login");
  }

  const codeOfConductUrl = process.env.CODE_OF_CONDUCT_URL;
  if (!codeOfConductUrl || member.codeOfConductAgreedAt) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-2xl">
            📜
          </div>
          <h1 className="text-xl font-bold text-neutral-900">行動規範への同意</h1>
          <p className="mt-2 text-sm text-neutral-500">
            チームの行動規範を確認し、内容に同意のうえ次へ進んでください。
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <a
          href={codeOfConductUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          行動規範を確認する（PDFが開きます）↗
        </a>

        <form action="/api/members/consent" method="POST" className="space-y-4">
          <label className="flex items-start gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 shrink-0" />
            <span>行動規範を確認しました。内容に同意します。</span>
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            同意して次へ
          </button>
        </form>
      </div>
    </main>
  );
}
