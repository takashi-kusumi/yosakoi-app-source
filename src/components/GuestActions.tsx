"use client";

import { useState } from "react";

/**
 * 管理者向け：体験参加者（ゲスト）の名前・参加状況の訂正、および削除。
 * isGuest=false の正部員に対しては表示されない（呼び出し側で絞り込み済み）。
 */
export function GuestActions({
  eventId,
  memberId,
  displayName,
  status,
}: {
  eventId: string;
  memberId: string;
  displayName: string;
  status: "ATTENDING" | "NOT_ATTENDING";
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500"
      >
        編集
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
      <form action={`/api/admin/events/${eventId}`} method="POST" className="space-y-2">
        <input type="hidden" name="action" value="updateGuest" />
        <input type="hidden" name="memberId" value={memberId} />
        <input
          name="displayName"
          defaultValue={displayName}
          required
          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
        />
        <select
          name="status"
          defaultValue={status}
          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
        >
          <option value="ATTENDING">参加</option>
          <option value="NOT_ATTENDING">不参加</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded bg-orange-600 py-1 text-xs font-semibold text-white"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 rounded border border-neutral-300 py-1 text-xs font-semibold text-neutral-500"
          >
            キャンセル
          </button>
        </div>
      </form>
      <form
        action={`/api/admin/events/${eventId}`}
        method="POST"
        onSubmit={(e) => {
          if (!confirm(`${displayName}さんの体験参加記録を削除しますか？元に戻せません。`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="action" value="deleteGuest" />
        <input type="hidden" name="memberId" value={memberId} />
        <button
          type="submit"
          className="w-full rounded border border-red-200 py-1 text-xs font-semibold text-red-600"
        >
          削除する
        </button>
      </form>
    </div>
  );
}
