import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { isGoogleLoginConfigured } from "@/lib/google";
import { APP_NAME } from "@/lib/brand";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // 有効なメンバーとしてログイン済みならホームへ（利用停止中の人はログイン画面に留める）
  const member = await getCurrentMember();
  if (member) {
    redirect("/dashboard");
  }
  const { error } = await searchParams;
  const configured = isGoogleLoginConfigured();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-neutral-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-3xl shadow-lg shadow-orange-600/20">
            🎋
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-neutral-500">練習とイベントの出欠をかんたんに</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {configured ? (
            <a
              href="/api/auth/google/start"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-[15px] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 active:bg-neutral-100"
            >
              <GoogleLogo />
              Googleでログイン
            </a>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Googleログインの設定（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET）がまだ完了していません。
            </p>
          )}

          <p className="mt-4 text-center text-xs leading-relaxed text-neutral-400">
            Gmail（Googleアカウント）でログインすると、そのまま使い始められます。
            <br />
            はじめてログインした人が管理者になります。
          </p>
        </div>
      </div>
    </main>
  );
}
