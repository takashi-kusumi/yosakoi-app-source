import Link from "next/link";
import { EVENT_TYPE_OPTIONS, VALID_EVENT_TYPES } from "@/lib/labels";

/** "NONE" = イベントに紐付いていないお知らせ（その他） */
export type NoticeTypeFilterValue = (typeof VALID_EVENT_TYPES)[number] | "NONE";

export function resolveNoticeTypeFilter(type?: string): NoticeTypeFilterValue | undefined {
  if (type === "NONE") return "NONE";
  if (VALID_EVENT_TYPES.includes(type as (typeof VALID_EVENT_TYPES)[number])) {
    return type as (typeof VALID_EVENT_TYPES)[number];
  }
  return undefined;
}

export function NoticeTypeFilter({
  basePath,
  typeFilter,
}: {
  basePath: string;
  typeFilter?: NoticeTypeFilterValue;
}) {
  const pillClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
      active
        ? "border-orange-600 bg-orange-600 text-white"
        : "border-neutral-200 bg-white text-neutral-500"
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 text-xs">
      <Link href={basePath} className={pillClass(!typeFilter)}>
        すべて
      </Link>
      {EVENT_TYPE_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          href={`${basePath}?type=${opt.value}`}
          className={pillClass(typeFilter === opt.value)}
        >
          {opt.label}
        </Link>
      ))}
      <Link href={`${basePath}?type=NONE`} className={pillClass(typeFilter === "NONE")}>
        その他
      </Link>
    </div>
  );
}
