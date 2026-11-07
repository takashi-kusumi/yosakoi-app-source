import Link from "next/link";

/** ページ上部の「‹ 戻る」リンク */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-block text-sm font-semibold text-neutral-500">
      ‹ {label}
    </Link>
  );
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-xl font-bold tracking-tight text-neutral-900">{children}</h1>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
      {children}
    </p>
  );
}

/** 一覧の1行（行全体がリンク） */
export function ListLinkCard({
  href,
  children,
  highlight,
}: {
  href: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-2xl border bg-white px-4 py-3.5 shadow-sm transition hover:shadow-md active:scale-[0.99] ${
        highlight ? "border-amber-200" : "border-neutral-200"
      }`}
    >
      {children}
    </Link>
  );
}

export const primaryButton =
  "rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-orange-600/20";
export const secondaryButton =
  "rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-center text-xs font-bold text-neutral-700 shadow-sm";
