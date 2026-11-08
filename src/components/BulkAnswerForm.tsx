"use client";

import { useMemo, useState } from "react";

type Status = "ATTENDING" | "UNDECIDED" | "NOT_ATTENDING";

export type BulkEventRow = {
  id: string;
  title: string;
  typeLabel: string;
  typeChipClass: string;
  dateLabel: string;
  weekday: string;
  location: string | null;
  deadline: string | null;
  status: Status | null;
  note: string | null;
};

const OPTIONS: { value: Status; label: string; active: string }[] = [
  { value: "ATTENDING", label: "参加", active: "border-emerald-600 bg-emerald-600 text-white" },
  { value: "UNDECIDED", label: "未定", active: "border-sky-600 bg-sky-600 text-white" },
  { value: "NOT_ATTENDING", label: "不参加", active: "border-neutral-600 bg-neutral-600 text-white" },
];

/**
 * 複数の予定に、1画面でまとめて回答するフォーム。
 * ボタンを選ぶだけでは保存されず、最後の「まとめて保存」で一度に送信する。
 */
export function BulkAnswerForm({ rows }: { rows: BulkEventRow[] }) {
  const [statuses, setStatuses] = useState<Record<string, Status | null>>(
    Object.fromEntries(rows.map((r) => [r.id, r.status]))
  );
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.id, r.note ?? ""]))
  );
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((r) => [r.id, !!r.note]))
  );

  const changedCount = useMemo(
    () =>
      rows.filter(
        (r) => statuses[r.id] && (statuses[r.id] !== r.status || (notes[r.id] ?? "") !== (r.note ?? ""))
      ).length,
    [rows, statuses, notes]
  );
  const unansweredCount = rows.filter((r) => !statuses[r.id]).length;

  function fillUnanswered(value: Status) {
    setStatuses((prev) => Object.fromEntries(rows.map((r) => [r.id, prev[r.id] ?? value])));
  }

  return (
    <form action="/api/events/bulk-respond" method="POST" className="space-y-3 pb-24">
      {unansweredCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold text-neutral-600">未回答 {unansweredCount}件を</span>
          <button
            type="button"
            onClick={() => fillUnanswered("ATTENDING")}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
          >
            すべて参加に
          </button>
          <button
            type="button"
            onClick={() => fillUnanswered("NOT_ATTENDING")}
            className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-600"
          >
            すべて不参加に
          </button>
        </div>
      )}

      {rows.map((r) => {
        const current = statuses[r.id];
        const changed = current && (current !== r.status || (notes[r.id] ?? "") !== (r.note ?? ""));
        return (
          <div
            key={r.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm ${
              changed ? "border-orange-300" : !current ? "border-amber-200" : "border-neutral-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-500">
                  <span className={r.weekday === "日" ? "text-red-500" : r.weekday === "土" ? "text-sky-600" : ""}>
                    {r.dateLabel}
                  </span>
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${r.typeChipClass}`}>
                    {r.typeLabel}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[15px] font-bold text-neutral-900">{r.title}</p>
                {r.location && <p className="truncate text-xs text-neutral-400">📍 {r.location}</p>}
                {r.deadline && !r.status && (
                  <p className="text-[11px] font-semibold text-amber-700">⏰ {r.deadline}</p>
                )}
              </div>
              {changed ? (
                <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">変更あり</span>
              ) : !current ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">未回答</span>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={`${r.title}の回答`}>
              {OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`cursor-pointer rounded-xl border py-2.5 text-center text-sm font-bold transition ${
                    current === o.value ? o.active : "border-neutral-200 bg-white text-neutral-600"
                  }`}
                >
                  <input
                    type="radio"
                    name={`status_${r.id}`}
                    value={o.value}
                    checked={current === o.value}
                    onChange={() => setStatuses({ ...statuses, [r.id]: o.value })}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>

            {openNotes[r.id] ? (
              <input
                type="text"
                name={`note_${r.id}`}
                maxLength={100}
                value={notes[r.id]}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                placeholder="メモ（例: 30分遅れます）"
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            ) : (
              <>
                <input type="hidden" name={`note_${r.id}`} value={notes[r.id]} />
                <button
                  type="button"
                  onClick={() => setOpenNotes({ ...openNotes, [r.id]: true })}
                  className="mt-2 text-xs font-semibold text-neutral-400"
                >
                  ＋ メモを付ける
                </button>
              </>
            )}
          </div>
        );
      })}

      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            type="submit"
            disabled={changedCount === 0}
            className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white shadow-sm disabled:bg-neutral-300"
          >
            {changedCount > 0 ? `${changedCount}件の回答をまとめて保存` : "回答を選んでください"}
          </button>
        </div>
      </div>
    </form>
  );
}
