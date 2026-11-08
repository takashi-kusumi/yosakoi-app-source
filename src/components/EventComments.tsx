import { Avatar } from "@/components/Avatar";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatDateTime, MAX_COMMENT_LENGTH } from "@/lib/labels";

type CommentRow = {
  comment: { id: string; body: string; createdAt: Date; memberId: string };
  memberName: string;
  pictureUrl: string | null;
  role: "ADMIN" | "MEMBER";
};

/** 予定ごとの質問・コメント（古い順に表示し、下に投稿欄） */
export function EventComments({
  eventId,
  comments,
  viewer,
  redirectTo,
}: {
  eventId: string;
  comments: CommentRow[];
  viewer: { id: string; isAdmin: boolean };
  redirectTo: string;
}) {
  const action = `/api/events/${eventId}/comments`;
  return (
    <section id="comments" className="scroll-mt-20 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-neutral-800">
        質問・コメント
        {comments.length > 0 && <span className="ml-1.5 text-xs font-semibold text-neutral-400">{comments.length}件</span>}
      </h2>
      <p className="mt-0.5 text-[11px] text-neutral-400">集合場所や持ち物など、この予定についての質問をメンバー全員に共有できます。</p>

      {comments.length > 0 && (
        <ul className="mt-3 space-y-3">
          {comments.map(({ comment, memberName, pictureUrl, role }) => {
            const mine = comment.memberId === viewer.id;
            return (
              <li key={comment.id} className="flex gap-2.5">
                <Avatar name={memberName} pictureUrl={pictureUrl} size={30} />
                <div className="min-w-0 flex-1">
                  <div className={`rounded-2xl rounded-tl-sm px-3.5 py-2.5 ${mine ? "bg-orange-50" : "bg-neutral-100"}`}>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-neutral-700">
                      {memberName}
                      {role === "ADMIN" && (
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">管理者</span>
                      )}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-800">{comment.body}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-3 pl-1">
                    <span className="text-[11px] text-neutral-400">{formatDateTime(comment.createdAt)}</span>
                    {(mine || viewer.isAdmin) && (
                      <form action={action} method="POST">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="commentId" value={comment.id} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <ConfirmSubmitButton message="このコメントを削除しますか？" className="text-[11px] font-semibold text-neutral-400 hover:text-red-500">
                          削除
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form action={action} method="POST" className="mt-4 space-y-2">
        <input type="hidden" name="action" value="add" />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <textarea
          name="body"
          required
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="例: 当日は何時に集合ですか？"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
        <button type="submit" className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-bold text-white">
          コメントする
        </button>
      </form>
    </section>
  );
}
