import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { WelcomeFlow } from "@/components/WelcomeFlow";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.onboardedAt) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-neutral-50 px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <WelcomeFlow googleName={member.displayName} isAdmin={member.role === "ADMIN"} />
      </div>
    </main>
  );
}
