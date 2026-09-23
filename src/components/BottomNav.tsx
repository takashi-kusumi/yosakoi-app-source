"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

export type NavBadges = {
  events?: number;
  notices?: number;
  surveys?: number;
};

export function BottomNav({
  isAdmin,
  badges,
}: {
  isAdmin: boolean;
  badges?: NavBadges;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", label: "ホーム", icon: "🏠" },
    { href: "/events", label: "イベント", icon: "📅", badge: badges?.events },
    { href: "/notices", label: "お知らせ", icon: "📢", badge: badges?.notices },
    { href: "/surveys", label: "アンケート", icon: "📝", badge: badges?.surveys },
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
                <span className="relative text-lg leading-none">
                  {item.icon}
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
