import { Avatar } from "@/components/Avatar";
import { GuestActions } from "@/components/GuestActions";

type Member = {
  id: string;
  displayName: string;
  pictureUrl: string | null;
  isGuest: boolean;
  guestAddedBy: string | null;
};
type Response = {
  status: "ATTENDING" | "NOT_ATTENDING" | "UNDECIDED";
  note: string | null;
};

const GROUPS = [
  { key: "ATTENDING", label: "参加", dot: "bg-emerald-500", text: "text-emerald-700" },
  { key: "UNDECIDED", label: "未定", dot: "bg-sky-400", text: "text-sky-700" },
  { key: "NOT_ATTENDING", label: "不参加", dot: "bg-neutral-400", text: "text-neutral-500" },
] as const;

/** 参加状況を「参加・未定・不参加・未回答」のグループに分けて表示する。メモも名前の下に出す */
export function AttendanceList({
  eventId,
  answered,
  unanswered,
  nameById,
  viewer,
  redirectTo,
}: {
  eventId: string;
  answered: { member: Member; response: Response }[];
  unanswered: Member[];
  nameById: Map<string, string>;
  viewer: { id: string; isAdmin: boolean };
  redirectTo: string;
}) {
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const list = answered.filter((a) => a.response.status === g.key);
        if (list.length === 0) return null;
        return (
          <div key={g.key}>
            <p className={`mb-1.5 flex items-center gap-1.5 text-xs font-bold ${g.text}`}>
              <span className={`h-2 w-2 rounded-full ${g.dot}`} />
              {g.label} {list.length}人
            </p>
            <ul className="divide-y divide-neutral-100">
              {list.map(({ member: m, response }) => {
                const canEditGuest = m.isGuest && (viewer.isAdmin || m.guestAddedBy === viewer.id);
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-2.5 py-2">
                    <Avatar name={m.displayName} pictureUrl={m.pictureUrl} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-neutral-800">
                        {m.displayName}
                        {m.id === viewer.id && <span className="text-[11px] font-normal text-neutral-400">（あなた）</span>}
                        {m.isGuest && (
                          <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                            体験
                          </span>
                        )}
                      </p>
                      {response.note && (
                        <p className="mt-0.5 break-words text-xs text-neutral-500">💬 {response.note}</p>
                      )}
                      {m.isGuest && m.guestAddedBy && nameById.get(m.guestAddedBy) && (
                        <p className="text-[11px] text-neutral-400">{nameById.get(m.guestAddedBy)}さんが追加</p>
                      )}
                    </div>
                    {canEditGuest && (
                      <GuestActions
                        eventId={eventId}
                        memberId={m.id}
                        displayName={m.displayName}
                        status={response.status}
                        note={response.note}
                        redirectTo={redirectTo}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {unanswered.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            未回答 {unanswered.length}人
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unanswered.map((m) => (
              <span key={m.id} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                {m.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      {answered.length === 0 && unanswered.length === 0 && (
        <p className="text-sm text-neutral-400">まだメンバーがいません</p>
      )}
    </div>
  );
}
