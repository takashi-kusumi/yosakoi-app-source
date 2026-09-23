"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: "ホーム", icon: "🏠" },
    { href: "/events", label: "イベント", icon: "📅" },
    { href: "/notices", label: "お知らせ", icon: "📢" },
    { href: "/surveys", label: "アンケート", icon: "📝" },
    { href: "/tools", label: "道具", icon: "🥢" },
  ];
  if (isAdmin) {
    items.push({ href: "/admin", label: "管理", icon: "⚙️" });
  }

  return (
    <nav className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? "text-orange-600" : "text-neutral-400"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
