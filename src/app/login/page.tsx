import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-2xl">
            🎋
          </div>
          <h1 className="text-xl font-bold text-neutral-900">
            よさこいチーム管理
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            練習・祭り・道具・飲み会の出欠をまとめて管理します
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <a
          href="/api/auth/line/start"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-3 font-semibold text-white shadow-sm transition hover:brightness-95 active:brightness-90"
        >
          <span className="text-lg">LINE</span>
          <span>でログイン</span>
        </a>

        <p className="mt-6 text-center text-xs text-neutral-400">
          はじめてログインした人が自動的に管理者になります。
        </p>
      </div>
    </main>
  );
}
