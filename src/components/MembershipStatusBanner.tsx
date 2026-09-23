import Link from "next/link";

export function MembershipStatusBanner({
  membershipStatus,
}: {
  membershipStatus: "TRIAL" | "REGULAR";
}) {
  if (membershipStatus !== "TRIAL") return null;

  return (
    <Link
      href="/register"
      className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm shadow-sm"
    >
      <span className="font-semibold text-orange-800">
        正部員登録がまだです。学年・パート・部員の種類・メールアドレスを登録しましょう
      </span>
      <span className="shrink-0 text-xs text-orange-600">登録する ›</span>
    </Link>
  );
}
