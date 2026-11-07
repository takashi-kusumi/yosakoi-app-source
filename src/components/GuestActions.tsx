"use client";

import { useState } from "react";

/** 体験者の名前・参加状況・メモの訂正と削除（追加した本人と管理者にだけ表示する） */
export function GuestActions({
  eventId,
  memberId,
  displayName,
  status,
  note,
  redirectTo,
}: {
  eventId: string;
  memberId: string;
  displayName: string;
  status: "ATTENDING" | "NOT_ATTENDING" | "UNDECIDED";
  note: string | null;
  redirectTo: string;
}) {
  const [editing, setEditing] = useState(false);
  const action = `/api/events/${eventId}/guests`;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full px-2 py-1 text-[11px] font-semibold text-neutral-400 hover:bg-neutral-100"
      >
        編集
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <form action={action} method="POST" className="space-y-2">
        <input type="hidden" name="action" value="update" />
        <input type="hidden" name="memberId" value={memberId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <input
          name="displayName"
          defaultValue={displayName}
          required
          maxLength={50}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status === "NOT_ATTENDING" ? "NOT_ATTENDING" : "ATTENDING"}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ATTENDING">参加</option>
          <option value="NOT_ATTENDING">不参加</option>
        </select>
        <input
          name="note"
          defaultValue={note ?? ""}
          maxLength={100}
          placeholder="メモ（任意）"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white">
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-semibold text-neutral-500"
          >
            キャンセル
          </button>
        </div>
      </form>
      <form
        action={action}
        method="POST"
        onSubmit={(e) => {
          if (!confirm(`${displayName}さんを削除しますか？`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="action" value="delete" />
        <input type="hidden" name="memberId" value={memberId} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button type="submit" className="w-full rounded-lg py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
          この体験者を削除する
        </button>
      </form>
    </div>
  );
}
