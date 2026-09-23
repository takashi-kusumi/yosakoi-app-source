"use client";

import { useState } from "react";

/**
 * 道具マスタ・グループ・演舞テーマなど、「名前だけのマスタ項目」に共通の
 * 名称変更・削除の小さな操作UI。テーブルのヘッダーセルなど、狭いスペースに置く想定。
 */
export function RenameDeleteActions({
  actionPath,
  idFieldName,
  id,
  name,
  deleteConfirmMessage,
  deleteDisabledReason,
}: {
  actionPath: string;
  idFieldName: string;
  id: string;
  name: string;
  deleteConfirmMessage: string;
  /** 指定すると削除ボタンの代わりに理由を表示し、削除できないようにする（例: 現在のテーマ） */
  deleteDisabledReason?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form action={actionPath} method="POST" className="flex items-center gap-1">
        <input type="hidden" name="action" value="rename" />
        <input type="hidden" name={idFieldName} value={id} />
        <input
          name="name"
          defaultValue={name}
          required
          autoFocus
          className="w-20 min-w-0 rounded border border-neutral-300 px-1.5 py-1 text-[11px] font-normal"
        />
        <button type="submit" className="shrink-0 text-[11px] font-semibold text-orange-600">
          保存
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="shrink-0 text-[11px] font-normal text-neutral-400"
        >
          取消
        </button>
      </form>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`${name}の名前を変更`}
        className="text-[11px] font-normal text-neutral-400"
      >
        ✎
      </button>
      {deleteDisabledReason ? (
        <span className="text-[11px] font-normal text-neutral-200" title={deleteDisabledReason}>
          🗑
        </span>
      ) : (
        <form
          action={actionPath}
          method="POST"
          onSubmit={(e) => {
            if (!window.confirm(deleteConfirmMessage)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name={idFieldName} value={id} />
          <button
            type="submit"
            aria-label={`${name}を削除`}
            className="text-[11px] font-normal text-red-400"
          >
            🗑
          </button>
        </form>
      )}
    </div>
  );
}
