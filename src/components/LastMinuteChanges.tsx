import { formatDateTime, STATUS_BADGE_CLASS, STATUS_SHORT } from "@/lib/labels";

type ChangeRow = {
  change: { id: string; fromStatus: string | null; toStatus: string; changedAt: Date };
  memberName: string;
  isGuest: boolean;
  proxyName: string | null;
};

function Chip({ status }: { status: string | null }) {
  if (!status) return <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">未回答</span>;
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${STATUS_BADGE_CLASS[status] ?? ""}`}>
      {STATUS_SHORT[status] ?? status}
    </span>
  );
}

/** 予定の前日以降・締切後に行われた回答の変更（管理者向け） */
export function LastMinuteChanges({ changes }: { changes: ChangeRow[] }) {
  if (changes.length === 0) return null;
  const cancels = changes.filter((c) => c.change.fromStatus === "ATTENDING" && c.change.toStatus !== "ATTENDING").length;
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <h2 className="text-sm font-bold text-amber-900">
        ⚠ 直前の変更 {changes.length}件
        {cancels > 0 && <span className="ml-1.5 text-xs font-bold text-red-600">（うち参加の取り消し {cancels}件）</span>}
      </h2>
      <p className="mt-0.5 text-[11px] text-amber-800/80">予定の前日以降、または回答締切の後に変わった回答です（新しい順）。</p>
      <ul className="mt-3 divide-y divide-amber-200/70">
        {changes.map(({ change, memberName, isGuest, proxyName }) => (
          <li key={change.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-sm">
            <span className="font-semibold text-neutral-800">
              {memberName}
              {isGuest && <span className="ml-1 text-[11px] font-normal text-violet-600">（体験）</span>}
            </span>
            <span className="flex items-center gap-1">
              <Chip status={change.fromStatus} />
              <span className="text-neutral-400">→</span>
              <Chip status={change.toStatus} />
            </span>
            <span className="ml-auto text-[11px] text-neutral-500">
              {formatDateTime(change.changedAt)}
              {proxyName && `（${proxyName}さんが代理入力）`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
