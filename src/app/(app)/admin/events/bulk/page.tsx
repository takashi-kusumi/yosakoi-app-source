import { FlashMessage } from "@/components/FlashMessage";
import { BackLink, Card, PageTitle } from "@/components/ui";
import { EVENT_TYPE_OPTIONS } from "@/lib/labels";
import { jstTodayKey, WEEKDAY_LABELS } from "@/lib/calendar";
import { addDaysKey, MAX_BULK_EVENTS } from "@/lib/recurrence";

const input =
  "w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100";
const label = "mb-1 block text-xs font-semibold text-neutral-600";

export default async function BulkEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const today = jstTodayKey();

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href="/admin" label="管理" />
      <PageTitle>毎週の予定をまとめて作成</PageTitle>
      <p className="text-xs text-neutral-400">
        「毎週土曜 18:30〜21:00、12月末まで」のように、繰り返しの練習を一度に作成できます（最大{MAX_BULK_EVENTS}件）。
        作成後は、1件ずつ編集・削除できます。
      </p>

      <Card>
        <form action="/api/admin/events/bulk" method="POST" className="space-y-4">
          <div>
            <label className={label}>種類</label>
            <select name="type" defaultValue="PRACTICE" className={input}>
              {EVENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>タイトル</label>
            <input name="title" required defaultValue="定期練習" className={input} />
          </div>

          <div>
            <span className={label}>曜日（複数選択可）</span>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_LABELS.map((w, i) => (
                <label
                  key={w}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border border-neutral-200 py-2.5 text-sm font-bold has-[:checked]:border-orange-500 has-[:checked]:bg-orange-600 has-[:checked]:text-white ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-sky-600" : "text-neutral-600"
                  }`}
                >
                  <input type="checkbox" name="weekdays" value={i} className="sr-only" />
                  {w}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>期間（開始日）</label>
              <input type="date" name="from" required defaultValue={today} className={input} />
            </div>
            <div>
              <label className={label}>期間（終了日）</label>
              <input type="date" name="to" required defaultValue={addDaysKey(today, 56)} className={input} />
            </div>
            <div>
              <label className={label}>開始時刻</label>
              <input type="time" name="startTime" required defaultValue="18:30" className={input} />
            </div>
            <div>
              <label className={label}>終了時刻（任意）</label>
              <input type="time" name="endTime" defaultValue="21:00" className={input} />
            </div>
          </div>

          <div>
            <label className={label}>場所（任意）</label>
            <input name="location" placeholder="例: 市民体育館 第2アリーナ" className={input} />
          </div>
          <div>
            <label className={label}>詳細（任意）</label>
            <textarea name="description" rows={3} placeholder="持ち物・注意事項など" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>回答締切</label>
              <select name="deadlineRule" defaultValue="prev21" className={input}>
                <option value="none">なし</option>
                <option value="prev21">前日の21:00</option>
                <option value="prev2_21">2日前の21:00</option>
              </select>
            </div>
            <div>
              <label className={label}>参加費（任意・円）</label>
              <input type="number" name="feeAmount" min={0} className={input} />
            </div>
          </div>

          <button type="submit" className="w-full rounded-xl bg-orange-600 py-3 text-sm font-bold text-white">
            まとめて作成する
          </button>
        </form>
      </Card>
    </div>
  );
}
